class UserMessageTool:
    """
    Tool for managing user messages that appear in the UI.
    """
    def __init__(self):
        self.current_message = None
        self.message_duration = None
        self._message_timestamp = None

    def set_message(self, message: str, duration_seconds: int):
        """Sets a message to be displayed to the user for a specific duration."""
        import time
        self.current_message = message
        self.message_duration = duration_seconds
        self._message_timestamp = time.time()

    def get_current_message(self):
        """Returns the current message if it hasn't expired, None otherwise."""
        import time
        if not self.current_message or not self._message_timestamp:
            return None
        
        elapsed = time.time() - self._message_timestamp
        if elapsed > self.message_duration:
            self.current_message = None
            self.message_duration = None
            self._message_timestamp = None
            return None
            
        return {
            "text": self.current_message,
            "remaining_seconds": max(0, self.message_duration - elapsed)
        }
