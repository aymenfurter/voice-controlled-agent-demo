from rtmt import RTMiddleTier, Tool, ToolResult, ToolResultDirection
from user_message import UserMessageTool

_show_message_schema = {
    "type": "function",
    "name": "show_message",
    "description": "Display a message to the user for a specified duration",
    "parameters": {
        "type": "object",
        "properties": {
            "message": {
                "type": "string",
                "description": "Message to display to the user"
            },
            "duration_seconds": {
                "type": "integer",
                "description": "How long to display the message in seconds"
            }
        },
        "required": ["message", "duration_seconds"],
        "additionalProperties": False
    }
}

async def _show_message(user_message: UserMessageTool, args):
    # make sure minimum is 10 seconds
    if args["duration_seconds"] < 20:
        args["duration_seconds"] = 20
    user_message.set_message(args["message"], args["duration_seconds"])
    return ToolResult("Message displayed to user", ToolResultDirection.TO_SERVER)

def attach_user_message_tools(rtmt: RTMiddleTier, user_message: UserMessageTool) -> None:
    """Attach user message tools to the RTMiddleTier instance"""
    rtmt.tools["show_message"] = Tool(
        schema=_show_message_schema,
        target=lambda args: _show_message(user_message, args)
    )
