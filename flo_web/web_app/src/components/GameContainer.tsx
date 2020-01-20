import React, { useState,useEffect  } from "react";
import * as ROSLIB from "roslib";
import { basicBlock } from "../styleDefs/styles";

interface CommandOpts{
    options: string[];
}

interface GameFeedback{
    feedback: string;
}

interface GameCommandProps{
    name: string;
    run:()=>void;
}

const GameCommand: React.FunctionComponent<GameCommandProps> = ({
    name, run})=>{
        return (
    <button
      type="button"
      style={{ wordWrap: "break-word" }}
      onClick={(): void => {
        run();
      }}
    >
      {name}
    </button>
        )
    }


interface GameDefProps{
    name: string;
    run: ()=>void;
    disabled: boolean;
}

const GameDef: React.FunctionComponent<GameDefProps> = ({
    name,run,disabled})=>{
        return (
      <button type="button" disabled={disabled} onClick={() => {
          run();
      }}>
          {name}
        </button>
        )
    }


interface GameContainerProps {
  ros: ROSLIB.Ros | null;
  connected: boolean;
}
// Takes a parameter ros, which is the connection to ros
const GameContainer: React.FunctionComponent<GameContainerProps> = ({
  ros,
  connected
}) => {

    const [commandOptions, setCommandOptions] = useState<string[]>([]);
    const [gameFeedback, setGameFeedback] = useState<string>('');
    const [gameDefPub, setGameDefPub] = useState<ROSLIB.Topic|null>(null);
    const [gameCommandPub, setGameCommandPub] = useState<ROSLIB.Topic|null>(null);


  useEffect(() => {
    if (!connected) return;

    const CommandListener = new ROSLIB.Topic({
      ros: ros as ROSLIB.Ros,
      name: "game_runner_command_opts",
      messageType: "flo_core/GameCommandOptions"
    });
    CommandListener.subscribe(msg => {
      setCommandOptions((msg as CommandOpts).options);
    });


    const FeedbackListener = new ROSLIB.Topic({
      ros: ros as ROSLIB.Ros,
      name: "game_runner_feedback",
      messageType: "flo_core/GameFeedback"
    });
    FeedbackListener.subscribe(msg => {
      setGameFeedback((msg as GameFeedback).feedback);
    });

     const gameDefPubT= new ROSLIB.Topic({
          ros: ros as ROSLIB.Ros,
          name: '/game_runner_def',
          messageType: 'flo_core/GameDef'
      });
      setGameDefPub(gameDefPubT);

     const gameCommandPubT= new ROSLIB.Topic({
          ros: ros as ROSLIB.Ros,
          name: '/game_runner_commands',
          messageType: 'flo_core/GameCommand'
      });
      setGameCommandPub(gameCommandPubT);

  }, [connected, ros]);

    const availableGames = ['simon_says','target_touch'];

        //{availableGames.map(value => (
            //<GameDef
            //name={value}
//disabled={gameFeedback!=='waiting_for_def' || gameDefPub===null}
                //run={()=>{
          //let game_def = new ROSLIB.Message({
              //game_type:{value}
          //})
          //if (gameDefPub !==null){
          //gameDefPub.publish(game_def)
          //}}}
            ///>

        //))}

  return (
    <div
      style={Object.assign({}, basicBlock, {
        maxwidth: "400px"
      })}
    >
      <h2>Games:</h2>

      <button type="button" disabled={gameFeedback!=='waiting_for_def' || gameDefPub===null} onClick={() => {

          let simon_says_def = new ROSLIB.Message({
              game_type:'simon_says'
          })
          if (gameDefPub !==null){
          gameDefPub.publish(simon_says_def)
          }
      }}>
          Simon Says
        </button>

      <button type="button" disabled={gameFeedback!=='waiting_for_def' || gameDefPub===null} onClick={() => {

          let simon_says_def = new ROSLIB.Message({
              game_type:'target_touch'
          })
          if (gameDefPub !==null){
          gameDefPub.publish(simon_says_def)
          }
      }}>
          Target Touch
        </button>

        {commandOptions.map(value => (
          <GameCommand
            name={value}
            run={() => {
                let msg = new ROSLIB.Message({
                        command: value
                    })
                if(gameCommandPub !== null){
             gameCommandPub.publish(msg);
                }
              }}
          />
        ))}

        </div>
  );
};

export default GameContainer;