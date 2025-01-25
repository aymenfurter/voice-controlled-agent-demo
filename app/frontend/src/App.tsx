import { useState, useEffect, useRef } from "react";
import { Power, Mic, MicOff } from "lucide-react"; // Change the imports to mic icons
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import StatusMessage from "@/components/ui/status-message";
import { Card, CardContent } from "@/components/ui/card";

import useRealTime from "@/hooks/useRealtime";
import useAudioRecorder from "@/hooks/useAudioRecorder";
import useAudioPlayer from "@/hooks/useAudioPlayer";

type LaunchSite = 
    | "Guiana Space Centre, French Guiana"
    | "Baikonur Cosmodrome, Kazakhstan"
    | "Vandenberg Space Force Base, USA"
    | "Rocket Lab Launch Complex 1, New Zealand"
    | "Cape Canaveral Space Launch Complex, Florida";

type Coordinates = {
    [K in LaunchSite]: { lat: number; lng: number };
};

function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [systemStatus] = useState("STANDBY");
    const [launchData, setLaunchData] = useState<any>({});
    const [userMessage, setUserMessage] = useState<{text: string, remaining_seconds: number} | null>(null);
    const mapRef = useRef<L.Map | null>(null);

    const { startSession, addUserAudio, inputAudioBufferClear } = useRealTime({
        onWebSocketOpen: () => console.log("WebSocket connection opened"),
        onWebSocketClose: () => console.log("WebSocket connection closed"),
        onWebSocketError: event => console.error("WebSocket error:", event),
        onReceivedError: message => console.error("error", message),
        onReceivedResponseAudioDelta: message => {
            isRecording && playAudio(message.delta);
        },
        onReceivedInputAudioBufferSpeechStarted: () => {
            stopAudioPlayer();
        },
    });

    const { reset: resetAudioPlayer, play: playAudio, stop: stopAudioPlayer } = useAudioPlayer();
    const { 
        start: startAudioRecording, 
        stop: stopAudioRecording,
        toggleMute: toggleMicMute,
        isMuted: isMicMuted 
    } = useAudioRecorder({ onAudioRecorded: addUserAudio });

    const onToggleListening = async () => {
        if (!isRecording) {
            startSession();
            await startAudioRecording();
            resetAudioPlayer();

            setIsRecording(true);
        } else {
            await stopAudioRecording();
            stopAudioPlayer();
            inputAudioBufferClear();

            setIsRecording(false);
        }
    };

    // Create a helper to initialize or update the map
    function initializeOrUpdateMap(launchSite: string) {
        const coords: Coordinates = {
            "Guiana Space Centre, French Guiana": { lat: 5.239, lng: -52.768 },
            "Baikonur Cosmodrome, Kazakhstan": { lat: 45.965, lng: 63.305 },
            "Vandenberg Space Force Base, USA": { lat: 34.759, lng: -120.554 },
            "Rocket Lab Launch Complex 1, New Zealand": { lat: -39.262, lng: 177.864 },
            "Cape Canaveral Space Launch Complex, Florida": { lat: 28.396, lng: -80.605 },
        };

        // Custom icon setup
        const defaultIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                width: 25px;
                height: 41px;
                background-color: #2563eb;
                border-radius: 50% 50% 50% 0;
                transform: rotate(-45deg);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
            "></div>`,
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        });
        L.Marker.prototype.options.icon = defaultIcon;

        // If we haven't created a map yet, do so
        if (!mapRef.current) {
            const mapInstance = L.map("launch-map").setView([0, 0], 1);
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "Map data © OpenStreetMap contributors",
                maxZoom: 18,
            }).addTo(mapInstance);
            mapRef.current = mapInstance;
        }

        if (launchSite && launchSite in coords) {
            const location = coords[launchSite as LaunchSite];
            mapRef.current?.setView([location.lat, location.lng], 8);

            // Clear old markers
            mapRef.current?.eachLayer((layer: L.Layer) => {
                if (layer instanceof L.Marker) {
                    mapRef.current?.removeLayer(layer);
                }
            });

            // Add a new marker
            const marker = L.marker([location.lat, location.lng]).addTo(mapRef.current);
            marker.bindPopup(launchSite).openPopup();
        } else {
            mapRef.current?.setView([0, 0], 1);
            mapRef.current?.eachLayer((layer: L.Layer) => {
                if (layer instanceof L.Marker) {
                    mapRef.current?.removeLayer(layer);
                }
            });
        }
    }

    // Fetch the current launch state and update the UI
    function fetchLaunchState() {
        fetch("/api/state")
            .then(res => res.json())
            .then(state => {
                setLaunchData(state);
                initializeOrUpdateMap(state.selected_launch_site);

                // If launch just happened, start sequence
                if (state.launched && !launchData.launched) {
                    startLaunchSequence();
                }
            });
    }

    function startLaunchSequence() {
        const rocketAnimation = document.getElementById("rocket-animation");
        if (!rocketAnimation) return;
        rocketAnimation.classList.add("launch");
        setTimeout(() => {
            rocketAnimation.classList.remove("launch");
            const rocketEl = document.querySelector<HTMLElement>(".rocket");
            if (rocketEl) rocketEl.style.opacity = "0";
            showCrewTransmissionPopup();
        }, 3000);
    }

    function showCrewTransmissionPopup() {
        const popup = document.getElementById("crew-transmission-popup");
        if (!popup) return;

        const viewBtn = document.getElementById("view-transmission-button");
        const closeBtn = document.getElementById("close-popup-button");
        const loadingIndicator = document.getElementById("loading-indicator");
        const container = document.getElementById("crew-photo-container");

        if (!viewBtn || !closeBtn || !loadingIndicator || !container) return;

        const newViewBtn = viewBtn.cloneNode(true) as HTMLElement;
        const newCloseBtn = closeBtn.cloneNode(true) as HTMLElement;

        viewBtn.parentNode?.replaceChild(newViewBtn, viewBtn);
        closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);

        newViewBtn.addEventListener("click", () => {
            loadingIndicator.style.display = "block";
            fetch("/api/crew-photo")
                .then(res => res.json())
                .then(data => {
                    const img = document.createElement("img");
                    img.src = data.image_url;
                    img.onload = () => {
                        loadingIndicator.style.display = "none";
                        container.innerHTML = "";
                        container.appendChild(img);
                    };
                });
        });

        newCloseBtn.addEventListener("click", () => {
            popup.classList.remove("show");
            popup.classList.add("hidden");
        });

        popup.classList.remove("hidden");
        popup.classList.add("show");
    }

    // Poll the state from /api/state periodically
    useEffect(() => {
        const intervalId = setInterval(fetchLaunchState, 1000);
        return () => clearInterval(intervalId);
    }, [launchData]);

    useEffect(() => {
        const fetchState = () => {
            fetch("/api/state")
                .then(res => res.json())
                .then(state => {
                    setLaunchData(state);
                    setUserMessage(state.user_message);
                    initializeOrUpdateMap(state.selected_launch_site);

                    // If launch just happened, start sequence
                    if (state.launched && !launchData.launched) {
                        startLaunchSequence();
                    }
                });
        };
        const intervalId = setInterval(fetchState, 1000);
        return () => clearInterval(intervalId);
    }, [launchData]);

    const renderMessageContent = (text: string) => {
        return <div dangerouslySetInnerHTML={{ __html: text }} />;
    };

    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (userMessage) {
            setProgress(100);
            const interval = setInterval(() => {
                setProgress((prev) => Math.max(0, prev - (100 / userMessage.remaining_seconds)));
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [userMessage]);

    const formatTime = (seconds: number) => {
        return Math.ceil(seconds);
    };

    return (
        <div className="flex min-h-screen flex-col bg-background p-4">
            {userMessage && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
                    <div className="system-message rounded-lg shadow-lg border border-primary/30">
                        <div className="system-message-header">
                            <div className="system-message-header-icon" />
                            <div className="message-duration">
                                {formatTime(userMessage.remaining_seconds)}s
                            </div>
                        </div>
                        <div className="system-message-content">
                            {renderMessageContent(userMessage.text)}
                            <div className="message-progress">
                                <div 
                                    className="message-progress-bar" 
                                    style={{ width: `${progress}%` }} 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="computer-container flex-grow rounded-lg p-6">
                <header className="mb-8 flex items-center justify-between border-b border-primary/50 pb-4">
                    <div className="flex items-center space-x-4">
                        <Power className="h-8 w-8 text-primary animate-pulse" />
                        <h1 className="computer-text text-3xl font-bold tracking-wider">ROCKET LAUNCH SYSTEM TERMINAL</h1>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm">STATUS:</span>
                        <span className={`text-sm ${systemStatus === "ACTIVE" ? "text-green-400" : "text-primary"}`}>
                            {systemStatus}
                        </span>
                    </div>
                </header>

                <main className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Voice Interface Card - Full Width */}
                    <Card className="computer-container bg-card/50 lg:col-span-2">
                        <CardContent className="p-4">
                            <h2 className="computer-text mb-4 text-xl">VOICE INTERFACE</h2>
                            <div className="flex flex-col items-center space-y-4">
                                <Button
                                    onClick={onToggleListening}
                                    className={`h-16 w-full ${
                                        isRecording 
                                            ? "bg-destructive hover:bg-destructive/90" 
                                            : "bg-primary hover:bg-primary/90"
                                    }`}
                                >
                                    {isRecording ? "TERMINATE INPUT" : "INITIATE VOICE COMMAND"}
                                </Button>
                                <Button
                                    onClick={toggleMicMute}
                                    variant="outline"
                                    className="w-full flex items-center justify-center gap-2"
                                >
                                    {isMicMuted ? (
                                        <>
                                            <MicOff className="h-4 w-4" />
                                            UNMUTE MICROPHONE
                                        </>
                                    ) : (
                                        <>
                                            <Mic className="h-4 w-4" />
                                            MUTE MICROPHONE
                                        </>
                                    )}
                                </Button>
                                <StatusMessage isRecording={isRecording} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Left Side - Mission Details */}
                    <Card className="computer-container bg-card/50">
                        <CardContent className="p-4">
                            <h2 className="computer-text mb-4 text-xl flex items-center">
                                <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
                                Mission Details
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="computer-info-panel">
                                    <h3 className="text-primary font-semibold mb-2 flex items-center">
                                        <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                                        Launch Site
                                    </h3>
                                    <p className="font-mono">{launchData?.selected_launch_site || "AWAITING INPUT"}</p>
                                </div>
                                <div className="computer-info-panel">
                                    <h3 className="text-primary font-semibold mb-2 flex items-center">
                                        <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                                        Rocket & Suit
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="computer-metric">
                                            <span className="text-xs text-muted-foreground">ROCKET</span>
                                            <p className="font-mono">{launchData?.selected_rocket || "NOT SELECTED"}</p>
                                        </div>
                                        <div className="computer-metric">
                                            <span className="text-xs text-muted-foreground">SUIT</span>
                                            <p className="font-mono">{launchData?.selected_suit || "NOT SELECTED"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="computer-info-panel">
                                    <h3 className="text-primary font-semibold mb-2 flex items-center">
                                        <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                                        Fuel Systems
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="computer-metric">
                                            <span className="text-xs text-muted-foreground">TYPE</span>
                                            <p className="font-mono">{launchData?.fuel_type || "NOT SELECTED"}</p>
                                        </div>
                                        <div className="computer-metric">
                                            <span className="text-xs text-muted-foreground">QUANTITY</span>
                                            <p className="font-mono">{launchData?.fuel_quantity ? `${launchData.fuel_quantity}kg` : "NOT SET"}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="computer-info-panel">
                                    <h3 className="text-primary font-semibold mb-2 flex items-center">
                                        <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                                        Resources
                                    </h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="computer-metric">
                                            <span className="text-xs text-muted-foreground">FOOD SUPPLIES</span>
                                            <p className="font-mono">{launchData?.food_supplies || "NOT SELECTED"}</p>
                                        </div>
                                        <div className="computer-metric">
                                            <span className="text-xs text-muted-foreground">MISSION COST</span>
                                            <p className="font-mono">{launchData?.estimated_cost || ""}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right Side - Map */}
                    <Card className="computer-container bg-card/50">
                        <CardContent className="p-4">
                            <h2 className="computer-text mb-4 text-xl flex items-center">
                                <div className="w-2 h-2 bg-primary rounded-full mr-2 animate-pulse" />
                                Launch Site Location
                            </h2>
                            <div className="computer-map-container h-[600px]">
                                <div id="launch-map" className="h-full rounded-lg overflow-hidden border-2 border-primary/30" />
                                <div id="rocket-animation" className="absolute bottom-0 left-1/2 transform -translate-x-1/2 z-[1000]">
                                    <div className="rocket" />
                                    <div className="fire" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </div>

            <footer className="mt-4 text-center text-sm text-primary/60">
                ROCKET LAUNCH SYSTEM v2.0 || AUTHORIZED ACCESS ONLY
            </footer>

            <div id="crew-transmission-popup" className="fixed inset-0 hidden">
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
                <div className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
                    <Card className="computer-container w-[90vw] max-w-[500px]">
                        <CardContent className="p-6">
                            <h3 className="computer-text text-xl mb-4 flex items-center">
                                <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                                Transmission from the crew
                            </h3>
                            <div id="crew-photo-container" className="min-h-[200px] flex items-center justify-center border border-primary/30 rounded-lg p-4 bg-background/50">
                                <div id="loading-indicator" className="loading-indicator hidden">
                                    <span className="text-primary">Establishing connection...</span>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-4 mt-4">
                                <Button id="view-transmission-button" variant="outline">
                                    View Transmission
                                </Button>
                                <Button id="close-popup-button" variant="destructive">
                                    Close
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default App;
