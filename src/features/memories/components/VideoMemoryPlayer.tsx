import React from "react";
import { StyleSheet } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

/** Video memory player (expo-video) used inside the memory feed. */
export function VideoMemoryPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (playerInstance) => {
    playerInstance.loop = false;
  });

  return (
    <VideoView
      style={styles.memoryVideo}
      player={player}
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
    />
  );
}

const styles = StyleSheet.create({
  memoryVideo: {
    width: "100%",
    height: 200,
  },
});

export default VideoMemoryPlayer;