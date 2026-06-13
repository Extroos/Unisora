import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Mic, MicOff, Volume2, VideoOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'motion/react';
import { SpeakerCard } from './SpeakerCard';
import { VoiceControlBar } from './VoiceControlBar';
import { ScreenShareView } from '../screenshare/ScreenShareView';

interface VoiceChannelViewProps {
  channelId: string;
}

export function VoiceChannelView({ channelId }: VoiceChannelViewProps) {
  const { 
    channels, users, voiceState, voiceConnections, joinVoiceChannel, leaveVoiceChannel, 
    toggleMute, toggleDeafen, setSettingsOpen, requestToSpeak, 
    inviteToStage, moveToAudience, callState, toggleCallVideo
  } = useAppStore();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  const [showNoCameraModal, setShowNoCameraModal] = useState(false);

  const channel = channels.find(c => c.id === channelId);

  if (!channel) return null;

  const isConnected = voiceState.channelId === channelId;
  const isStage = channel.isStage;
  
  const connectedUserList = isConnected ? voiceState.connectedUsers.map(id => users[id]).filter(Boolean) : [];
  const speakers = isStage ? connectedUserList.filter(u => voiceState.stageSpeakers?.includes(u.id)) : connectedUserList;
  const audience = isStage ? connectedUserList.filter(u => !voiceState.stageSpeakers?.includes(u.id)) : [];
  const requests = isStage ? voiceState.stageRequests || [] : [];

  const isUserSpeaker = voiceState.stageSpeakers?.includes('u1');
  const hasRequested = voiceState.stageRequests?.includes('u1');

  // Webcam stream effect
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        
        const realDevices = videoDevices.filter(d => {
          const label = d.label.toLowerCase();
          return label && !label.includes('virtual') && !label.includes('obs');
        });

        let stream: MediaStream;
        if (realDevices.length > 0) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: realDevices[0].deviceId }, width: 1280, height: 720 },
            audio: false
          });
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: false
          });
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const trackLabel = videoTrack.label.toLowerCase();
          if (trackLabel.includes('virtual') || trackLabel.includes('obs')) {
            stream.getTracks().forEach(track => track.stop());
            throw new Error(`Virtual camera detected and ignored: ${videoTrack.label}`);
          }
        }

        activeStream = stream;
        setWebcamStream(stream);
      } catch (e) {
        console.error('Error starting webcam:', e);
        setWebcamStream(null);
      }
    };

    if (isConnected && !callState.isVideoOff) {
      startWebcam();
    } else {
      if (webcamStream) {
        webcamStream.getTracks().forEach(track => track.stop());
        setWebcamStream(null);
      }
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isConnected, callState.isVideoOff]);

  // Handle checking physical camera state before toggling video ON
  const handleToggleCallVideo = async () => {
    if (callState.isVideoOff) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        const realDevices = videoDevices.filter(d => {
          const label = d.label.toLowerCase();
          return label && !label.includes('virtual') && !label.includes('obs');
        });

        if (videoDevices.length === 0) {
          setShowNoCameraModal(true);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: false
        });
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const trackLabel = videoTrack.label.toLowerCase();
          if (trackLabel.includes('virtual') || trackLabel.includes('obs')) {
            stream.getTracks().forEach(track => track.stop());
            setShowNoCameraModal(true);
            return;
          }
        }
        stream.getTracks().forEach(track => track.stop());
        toggleCallVideo();
      } catch (e) {
        console.error('No camera or camera access denied:', e);
        setShowNoCameraModal(true);
      }
    } else {
      toggleCallVideo();
    }
  };

  // Screen share toggler - Direct browser capture
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
        setScreenShareStream(null);
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });

        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenShareStream(null);
        };

        setScreenShareStream(stream);
        setIsScreenSharing(true);
      } catch (e) {
        console.error('Error starting screenshare:', e);
        setIsScreenSharing(false);
        setScreenShareStream(null);
      }
    }
  };

  // Cleanup screen sharing on disconnect
  useEffect(() => {
    if (!isConnected) {
      if (screenShareStream) {
        screenShareStream.getTracks().forEach(track => track.stop());
        setScreenShareStream(null);
      }
      setIsScreenSharing(false);
    }
  }, [isConnected]);

  return (
    <div className="flex-1 flex flex-col bg-black relative overflow-hidden h-full">
      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6">
        {!isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 rounded-[32px] bg-[#2b2d31] flex items-center justify-center mb-6 shadow-xl border border-white/5">
              {isStage ? <Mic size={40} className="text-[#dbdee1]" /> : <Volume2 size={40} className="text-[#dbdee1]" />}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{isStage ? 'Ready to join the stage?' : 'Voice Channel'}</h2>
            <p className="text-text-secondary mb-8 max-w-sm text-sm">
              {isStage 
                ? "You'll join as an audience member. You can request to speak once you're inside."
                : `Join ${channel.name} to talk with your team using high-fidelity audio.`}
            </p>
            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => joinVoiceChannel(channelId)} 
              className="w-full max-w-[280px] bg-[#5865f2] hover:bg-[#4752c4] text-white font-medium"
            >
              {isStage ? 'Join as Audience' : 'Connect Voice'}
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6 h-full justify-between pb-24">
            {(() => {
              const isSomeoneStreaming = (webcamStream !== null && !callState.isVideoOff) || (screenShareStream !== null);

              if (!isSomeoneStreaming) {
                // Return normal layout with circular avatars
                return (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-0">
                    <div className="flex flex-row flex-wrap items-center justify-center gap-8 py-4 w-full overflow-y-auto max-w-4xl">
                      {speakers.map(user => {
                        const conn = voiceConnections?.[user.id];
                        const isMe = user.id === 'u1';
                        return (
                          <div key={user.id} className="flex flex-col items-center gap-3 relative shrink-0">
                            <div className="relative">
                              <Avatar
                                src={user.avatarUrl}
                                alt={user.username}
                                size="xl"
                                circular={true}
                                className={cn(
                                  "relative z-10 transition-all duration-300 ring-[3px]",
                                  conn?.isSpeaking && !conn?.isMuted ? "ring-[#23a55a] shadow-[0_0_15px_rgba(35,165,90,0.2)]" : "ring-transparent"
                                )}
                              />
                              {conn?.isMuted && (
                                <div className="absolute -bottom-1 -right-1 bg-[#f23f43] text-white p-1 rounded-full z-20 border border-black scale-95">
                                  <MicOff size={11} />
                                </div>
                              )}
                            </div>
                            <span className="text-sm font-semibold text-text-primary select-none truncate max-w-[120px]">
                              {isMe ? 'You' : user.username}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Return video card grid layout
              const videoParticipants = [];
              speakers.forEach(user => {
                const conn = voiceConnections?.[user.id];
                const isMe = user.id === 'u1';
                
                // Push profile card
                videoParticipants.push({
                  id: user.id,
                  user: user,
                  isMe: isMe,
                  isMuted: conn?.isMuted || false,
                  isSpeaking: !!conn?.isSpeaking && !conn?.isMuted,
                  videoStream: isMe ? webcamStream : null,
                  isConnecting: isMe && voiceState.isConnecting,
                  hasNoCamera: isMe && !callState.isVideoOff && !webcamStream,
                  isScreenShare: false
                });

                // If screensharing, push screenshare card
                if (isMe && screenShareStream) {
                  videoParticipants.push({
                    id: `${user.id}-screen`,
                    user: user,
                    isMe: true,
                    isMuted: true,
                    isSpeaking: false,
                    videoStream: screenShareStream,
                    isScreenShare: true
                  });
                }
              });

              return (
                <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden p-2" style={{maxHeight: '85%'}}>
                  <div className="flex flex-row items-center justify-center gap-1 h-full w-full max-w-6xl mx-auto">
                    {videoParticipants.map(vp => (
                      <div 
                        key={vp.id} 
                        className={cn(
                          "relative aspect-video rounded-lg overflow-hidden bg-[#1e1f22] shadow-md transition-all duration-300 cursor-pointer select-none flex-shrink-0 h-full max-h-full",
                          vp.isSpeaking && !vp.isScreenShare ? "ring-[3px] ring-[#23a55a] shadow-[0_0_15px_rgba(35,165,90,0.2)] z-10" : ""
                        )}
                      >
                        <SpeakerCard 
                          user={vp.user} 
                          isMe={vp.isMe} 
                          isMuted={vp.isMuted}
                          isSpeaking={vp.isSpeaking}
                          videoStream={vp.videoStream}
                          isScreenShare={vp.isScreenShare}
                          isConnecting={vp.isConnecting}
                          hasNoCamera={vp.hasNoCamera}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Audience Section */}
            {isStage && audience.length > 0 && (
              <div className="max-w-6xl mx-auto w-full border-t border-white/5 pt-6 shrink-0">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-6">
                  {audience.map(user => (
                    <div key={user.id} className="flex flex-col items-center gap-2 group relative">
                      <div className="relative">
                        <Avatar src={user.avatarUrl} alt={user.username} size="lg" className="ring-2 ring-transparent group-hover:ring-[#313338] transition-all" />
                        {requests.includes(user.id) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#5865f2] text-white rounded-full flex items-center justify-center border-2 border-[#1e1f22] shadow-lg">
                            <Mic size={10} />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-medium text-text-secondary truncate w-full text-center group-hover:text-white transition-colors">{user.username}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <AnimatePresence>
        {isConnected && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
          >
            <VoiceControlBar
              isMuted={voiceState.isMuted}
              isDeafened={voiceState.isDeafened}
              isVideoOff={callState.isVideoOff}
              isScreenSharing={isScreenSharing}
              isStage={isStage}
              isUserSpeaker={isUserSpeaker}
              hasRequested={hasRequested}
              toggleMute={toggleMute}
              toggleDeafen={toggleDeafen}
              toggleCallVideo={handleToggleCallVideo}
              handleToggleScreenShare={handleToggleScreenShare}
              setSettingsOpen={setSettingsOpen}
              requestToSpeak={requestToSpeak}
              leaveVoiceChannel={leaveVoiceChannel}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Required Modal */}
      <AnimatePresence>
        {showNoCameraModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#313338] border border-white/5 w-full max-w-sm rounded-lg p-6 shadow-[0_24px_48px_rgba(0,0,0,0.8)] flex flex-col items-center text-center relative"
            >
              <div className="w-16 h-16 rounded-full bg-[#f23f43]/10 border border-[#f23f43]/20 flex items-center justify-center mb-4 text-[#f23f43]">
                <VideoOff size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Camera Required</h3>
              <p className="text-[#dbdee1]/70 text-xs mb-6 max-w-xs">
                We couldn't detect a physical camera. Please connect a webcam device to enable video features.
              </p>
              <Button 
                variant="primary" 
                size="md" 
                onClick={() => setShowNoCameraModal(false)}
                className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-2.5 rounded transition-all"
              >
                Okay
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
