from rtmt import RTMiddleTier, Tool, ToolResult, ToolResultDirection
from space_program import SpaceProgramTool
from user_message import UserMessageTool

# Tool schemas
_select_launch_site_schema = {
    "type": "function",
    "name": "select_launch_site",
    "description": "Select a specific launch site for the mission",
    "parameters": {
        "type": "object",
        "properties": {
            "site": {
                "type": "string",
                "description": "Name of the launch site to select"
            }
        },
        "required": ["site"],
        "additionalProperties": False
    }
}

_buy_food_schema = {
    "type": "function",
    "name": "buy_food",
    "description": "Purchase food supplies for the mission",
    "parameters": {
        "type": "object",
        "properties": {
            "meals": {
                "type": "string",
                "description": "Comma-separated list of meals"
            }
        },
        "required": ["meals"],
        "additionalProperties": False
    }
}

_buy_rocket_schema = {
    "type": "function",
    "name": "buy_rocket",
    "description": "Select and purchase a rocket for the mission",
    "parameters": {
        "type": "object",
        "properties": {
            "rocket": {
                "type": "string",
                "description": "Name of the rocket to purchase"
            }
        },
        "required": ["rocket"],
        "additionalProperties": False
    }
}

_buy_spacesuit_schema = {
    "type": "function",
    "name": "buy_spacesuit",
    "description": "Select and purchase a spacesuit",
    "parameters": {
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Name of the spacesuit to purchase"
            }
        },
        "required": ["name"],
        "additionalProperties": False
    }
}

_launch_rocket_schema = {
    "type": "function",
    "name": "launch_rocket",
    "description": "Launch the rocket if all conditions are met",
    "parameters": {
        "type": "object",
        "properties": {},
        "additionalProperties": False
    }
}

# Tool implementation functions
async def _select_launch_site(space_program: SpaceProgramTool, args):
    result = space_program.selectLaunchSite(args["site"])
    space_program.user_message.set_message(f"Launch site '{args['site']}' selected.", 10)
    return ToolResult(result, ToolResultDirection.TO_SERVER)

async def _buy_food(space_program: SpaceProgramTool, args):
    result = space_program.buyFood(args["meals"])
    space_program.user_message.set_message(f"Food supplies purchased: {args['meals']}", 10)
    return ToolResult(result, ToolResultDirection.TO_SERVER)

async def _buy_rocket(space_program: SpaceProgramTool, args):
    result = space_program.buySpaceRocket(args["rocket"])
    space_program.user_message.set_message(f"Rocket '{args['rocket']}' purchased.", 10)
    return ToolResult(result, ToolResultDirection.TO_SERVER)

async def _buy_spacesuit(space_program: SpaceProgramTool, args):
    result = space_program.buySpacesuit(args["name"])
    space_program.user_message.set_message(f"Spacesuit '{args['name']}' purchased.", 10)
    return ToolResult(result, ToolResultDirection.TO_SERVER)

async def _launch_rocket(space_program: SpaceProgramTool, args):
    result = space_program.launchRocket()
    if result.startswith("Launch successful"):
        space_program.user_message.set_message("🚀 Rocket launched successfully!", 15)
    else:
        space_program.user_message.set_message("⚠️ " + result, 15)
    return ToolResult(result, ToolResultDirection.TO_SERVER)

def attach_space_program_tools(rtmt: RTMiddleTier, space_program: SpaceProgramTool) -> None:
    """Attach all space program tools to the RTMiddleTier instance"""
    # Map each tool schema to its implementation
    tool_mappings = {
        "select_launch_site": (_select_launch_site_schema, _select_launch_site),
        "buy_food": (_buy_food_schema, _buy_food),
        "buy_rocket": (_buy_rocket_schema, _buy_rocket),
        "buy_spacesuit": (_buy_spacesuit_schema, _buy_spacesuit),
        "launch_rocket": (_launch_rocket_schema, _launch_rocket)
    }

    # Attach each tool to the RTMiddleTier instance
    for name, (schema, func) in tool_mappings.items():
        rtmt.tools[name] = Tool(
            schema=schema,
            target=lambda args, f=func: f(space_program, args)
        )
