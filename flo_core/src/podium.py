#!/usr/bin/env python
"""A module to display the robot screen using opencv"""

try:
    import tkinter as tk
except ImportError:
    import Tkinter as tk
from PIL import Image, ImageTk
import os
import Queue
import rospy
from std_msgs.msg import Bool
from sensor_msgs.msg import Image as smImage
from rosbridge_msgs.msg import ConnectedClients
from cv_bridge import CvBridge, CvBridgeError
import numpy as np
import rospkg
import cv2
from system_monitor.msg import NETstats
from tts.msg import SpeechActionFeedback
import math

# Screen is 800x480

HOME_TIME = 5
UPDATE_HOME_TIME = 1


class PodiumScreen(object):
    """Class to display the podium"""

    # This is a ros node, no need for public methods:
    # pylint: disable=too-few-public-methods

    # Such is the nature of GUIs:
    # pylint: disable=too-many-instance-attributes

    def __init__(self):
        rospy.init_node('podium_screen')

        self.window = tk.Tk()  # Makes main window
        # self.window.overrideredirect(True)
        # self.window.wm_attributes("-topmost", True)
        # self.window.geometry("800x480+0+0")
        self.window.geometry(
            "{0}x{1}+0+0".format(self.window.winfo_screenwidth(), self.window.winfo_screenheight()))
        self.displayu = tk.Label(self.window)
        self.displayu.grid(row=2, column=0, padx=0, pady=0)  # Display 1

        self.displayl = tk.Label(self.window)
        self.displayl.grid(row=1, column=0, padx=0, pady=0)  # Display 1

        self.recording = False

        self.image_queue_l = Queue.Queue()
        self.image_queue_u = Queue.Queue()

        self.last_msg = 0
        self.last_home_update = 0

        # cap = cv2.VideoCapture(0)
        rospy.loginfo('Started Podium Screen Node')

        self.bridge = CvBridge()
        # msg = rospy.wait_for_message("videofile/image_raw", smImage)
        # self.new_img(msg)
        rospy.Subscriber('/upper_realsense/color/image_web',
                         smImage, self.__new_img_l)
        rospy.Subscriber('/lower_realsense/color/image_web',
                         smImage, self.__new_img_u)
        rospy.Subscriber('/record_video_status', Bool,
                         self.__set_recording_state)
        self.__run_display()

    def __set_recording_state(self, msg):
        self.recording = msg.data

    def __run_display(self):
        rate = rospy.Rate(45)
        while not rospy.is_shutdown():
            img_l = None
            img_u = None
            empty = False
            while not empty:
                try:
                    img_l = self.image_queue_l.get_nowait()
                except Queue.Empty:
                    empty = True
            empty = False
            while not empty:
                try:
                    img_u = self.image_queue_u.get_nowait()
                except Queue.Empty:
                    empty = True
            if img_l is not None:
                img = Image.fromarray(img_l)
                imgtk = ImageTk.PhotoImage(master=self.displayl, image=img)
                self.displayl.imgtk = imgtk
                self.displayl.configure(image=imgtk)
            if img_u is not None:
                img = Image.fromarray(img_u)
                imgtk = ImageTk.PhotoImage(master=self.displayu, image=img)
                self.displayu.imgtk = imgtk
                self.displayu.configure(image=imgtk)
            self.window.update_idletasks()
            self.window.update()

            rate.sleep()

    def __new_img_l(self, msg):
        try:
            cv_image = self.bridge.imgmsg_to_cv2(msg, "rgb8")
        except CvBridgeError as err:
            rospy.logerr('error converting message to cvmat: %s', err)
            return
        # res_img = cv2.resize(cv_image, (800, 480))
        self.image_queue_l.put(cv_image)

    def __new_img_u(self, msg):
        try:
            cv_image = self.bridge.imgmsg_to_cv2(msg, "rgb8")
        except CvBridgeError as err:
            rospy.logerr('error converting message to cvmat: %s', err)
            return
        # res_img = cv2.resize(cv_image, (800, 480))
        self.image_queue_u.put(cv_image)


if __name__ == '__main__':
    PodiumScreen()
