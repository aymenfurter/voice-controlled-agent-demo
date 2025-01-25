import { AlertCircle } from "lucide-react";
import "./status-message.css";

type Properties = {
    isRecording: boolean;
};

export default function StatusMessage({ isRecording }: Properties) {
    if (!isRecording) {
        return (
            <div className="flex items-center text-muted-foreground">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span className="text-sm">AWAITING VOICE INPUT</span>
            </div>
        );
    }

    return (
        <div className="flex items-center text-primary">
            <div className="computer-waveform mr-2">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="computer-bar" />
                ))}
            </div>
            <span className="text-sm">PROCESSING VOICE COMMAND</span>
        </div>
    );
}
