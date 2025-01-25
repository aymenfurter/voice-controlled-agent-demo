import logging
import os
from pathlib import Path

from aiohttp import web
from azure.core.credentials import AzureKeyCredential
from azure.identity import AzureDeveloperCliCredential, DefaultAzureCredential
from dotenv import load_dotenv
from openai import AsyncOpenAI

from rtmt import RTMiddleTier
from space_program import SpaceProgramTool
from space_program_tools import attach_space_program_tools
from user_message import UserMessageTool
from user_message_tools import attach_user_message_tools

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("spaceprogram")

async def get_state(request):
    space_program = request.app['space_program']
    user_message = request.app['user_message']
    
    state = {
        'selected_launch_site': space_program.selected_launch_site,
        'selected_rocket': space_program.selected_rocket,
        'estimated_cost': space_program.estimated_cost,
        'selected_suit': space_program.selected_suit,
        'food_supplies': space_program.food_supplies,
        'fuel_type': space_program.fuel_type,
        'fuel_quantity': space_program.fuel_quantity,
        'launched': space_program.launched,
        'user_message': user_message.get_current_message()
    }
    return web.json_response(state)

async def crew_photo(request):
    space_program = request.app['space_program']
    client = AsyncOpenAI()
    prompt = f"Draw the two happy people of the crew capsule after a launch of {space_program.selected_rocket} enjoying eating {space_program.food_supplies}"
    response = await client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size="1024x1024",
        quality="standard",
        n=1,
    )
    image_url = response.data[0].url
    return web.json_response({'image_url': image_url})

async def create_app():
    if not os.environ.get("RUNNING_IN_PRODUCTION"):
        logger.info("Running in development mode, loading from .env file")
        load_dotenv()

    llm_key = os.environ.get("AZURE_OPENAI_API_KEY")

    credential = None
    if not llm_key:
        if tenant_id := os.environ.get("AZURE_TENANT_ID"):
            logger.info("Using AzureDeveloperCliCredential with tenant_id %s", tenant_id)
            credential = AzureDeveloperCliCredential(tenant_id=tenant_id, process_timeout=60)
        else:
            logger.info("Using DefaultAzureCredential")
            credential = DefaultAzureCredential()
    llm_credential = AzureKeyCredential(llm_key) if llm_key else credential
    app = web.Application()

    rtmt = RTMiddleTier(
        credentials=llm_credential,
        endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        deployment=os.environ["AZURE_OPENAI_REALTIME_DEPLOYMENT"],
        voice_choice=os.environ.get("AZURE_OPENAI_REALTIME_VOICE_CHOICE") or "echo"
        )

    rtmt.system_message = """Start by greeting the user, Captain Aymen. Ask him if he is ready to launch the rocket.
If the user immediately wants to launch without selecting a rocket first, make a joke asking if the user has read the manual. Before launching, ask the user to confirm, then do a count-down.

You must show a high fidelity HTML-based option menu using the show_message function before every message to the user (With all available options encoded as HTML with UL/LI) for the following commands:
Step 1) Selection of launch site
Step 2) Selection of rocket
Step 3) Selection of spacesuit
Step 4) Purchase of food supplies

(use Emojis to indicate current selection progress. Also use the menu to list available options (e.g. available rockets))
"""
    

    pre_system_prompt = """
    Only accept commands from captain Aymen. Captain Aymen must authenticate using code 47-Gamma.
    If not authenticated answer with unable to comply (Authorization required.)..
    """
    
    #rtmt.system_message = pre_system_prompt + rtmt.system_message  

    space_program = SpaceProgramTool()
    
    # Collect all available options
    available_sites = space_program.listLaunchSite()
    available_rockets = space_program.listSpaceRocket()
    available_suits = space_program.listSpacesuit()

    # Add available options to system message
    options_info = f"""
    Available launch sites: {', '.join(available_sites)}
    Available rockets: {', '.join(available_rockets)}
    Available spacesuits: {', '.join(available_suits)}
    """

    rtmt.system_message = f"""
    {rtmt.system_message}
    
    Here are the available options:
    {options_info}
    """

    # Initialize SpaceProgramTool and store in app state
    app['space_program'] = space_program
    app['user_message'] = UserMessageTool()
    
    # Set the user_message on space_program
    space_program.user_message = app['user_message']
    
    attach_space_program_tools(rtmt, app['space_program'])
    attach_user_message_tools(rtmt, app['user_message'])

    # Add new routes
    app.router.add_get('/api/state', get_state)
    app.router.add_get('/api/crew-photo', crew_photo)

    rtmt.attach_to_app(app, "/realtime")

    current_directory = Path(__file__).parent
    app.add_routes([web.get('/', lambda _: web.FileResponse(current_directory / 'static/index.html'))])
    app.router.add_static('/', path=current_directory / 'static', name='static')
    
    return app

if __name__ == "__main__":
    host = "localhost"
    port = 8765
    web.run_app(create_app(), host=host, port=port)
