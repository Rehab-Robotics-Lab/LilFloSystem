import React, { useEffect, useState } from 'react';
import * as ROS3D from 'ros3d';
import * as ROSLIB from 'roslib';
import PropTypes from 'prop-types';

// Takes a parameter ros, which is the connection to ros
function URDF({ ros, connected }) {
  const [viewer, setViewer] = useState(null);
  const [client, setClient] = useState(null);

  // We need to wait until the target diff exists
  useEffect(() => {
    // if (viewer !== null) return; I don't think this is an issue since
    // this only runs once
    // The view window
    const vw = new ROS3D.Viewer({
      divID: 'urdf',
      width: 400,
      height: 400,
      antialias: true,
      background: '#f2f2f2', // sets the background color
      alpha: 0.3, // background transparency
      cameraPose: { x: 0.2, y: 0.75, z: 0.05 },
    });
    // A grid
    // vw.addObject(new ROS3D.Grid({ num_cells: 5, cellSize: 0.1 }));
    setViewer(vw);
  }, []);

  useEffect(() => {
    if (!connected) {
      if (client !== null) {
        viewer.scene.remove(client.urdf);
        setClient(null);
      }
      return;
    }
    if (client !== null) return;

    // The connection to move things around, thresholded to prevent too many redraws
    const tfClient = new ROSLIB.TFClient({
      ros,
      angularThres: 0.01,
      transThres: 0.01,
      rate: 10.0,
    });

    // The URDF Loader and drawer
    const clientT = new ROS3D.UrdfClient({
      ros,
      tfClient,
      path: `${process.env.PUBLIC_URL}/mesh_root/`,
      rootObject: viewer.scene,
      // loader: ROS3D.COLLADA_LOADER_2,
    });

    setClient(clientT);
  });

  return (
    <div id="urdf" />
  );
}

URDF.defaultProps = {
  ros: null,
};

URDF.propTypes = {
  ros: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  connected: PropTypes.bool.isRequired,
};


export default URDF;