from user_message import UserMessageTool

class SpaceProgramTool:
    """
    Description: This tool provides functions to interact with a space program.

    Usage:
        tool = SpaceProgramTool)

    Examples:
        tool.listLaunchSite()
        tool.selectLaunchSite("Guiana Space Centre, French Guiana")
        tool.buySpaceRocket("Falcon Heavy")
        tool.launchRocket()
    """

    def __init__(self):
        self.selected_launch_site = None
        self.selected_rocket = None
        self.estimated_cost = None
        self.selected_suit = None
        self.food_supplies = None
        self.fuel_type = None
        self.fuel_quantity = None
        self.launched = False
        self.rocket_specs = {
            "Falcon 9": {
                "fuel_type": "RP-1/LOX",
                "fuel_quantity": 287000,
                "cost": "$67 million"
            },
            "Falcon Heavy": {
                "fuel_type": "RP-1/LOX",
                "fuel_quantity": 478000,
                "cost": "$97 million"
            },
            "Starship": {
                "fuel_type": "Liquid Methane/LOX",
                "fuel_quantity": 3400000,
                "cost": "$200 million"
            },
            "SLS": {
                "fuel_type": "Liquid Hydrogen/LOX",
                "fuel_quantity": 730000,
                "cost": "$2 billion"
            },
            "Delta IV Heavy": {
                "fuel_type": "Liquid Hydrogen/LOX",
                "fuel_quantity": 465000,
                "cost": "$350 million"
            }
        }
        self.fallback_specs = {
            "fuel_type": "RP-1/LOX",  # Most common fuel type
            "fuel_quantity": 200000,   # Conservative estimate
            "cost": "$150 million"     # Average cost estimate
        }
        self.user_message = None  # Will be set when tools are attached

    def listLaunchSite(self):
        """
        Lists available launch sites.
        """
        return [
            "Guiana Space Centre, French Guiana",
            "Baikonur Cosmodrome, Kazakhstan",
            "Vandenberg Space Force Base, USA",
            "Rocket Lab Launch Complex 1, New Zealand",
            "Cape Canaveral Space Launch Complex, Florida"
        ]

    def selectLaunchSite(self, site: str):
        """
        Selects a launch site.
        """
        self.selected_launch_site = site
        return f"Launch site set to: {site}"

    def listSpacesuit(self):
        """
        Lists available spacesuits.
        """
        print ("Listing all available spacesuits")
        return [
            "Advanced Crew Escape Suit",
            "Sokol Space Suit",
            "Orlan Space Suit",
            "Launch Entry Suit"
        ]

    def listSpaceRocket(self):
        """
        Lists available space rockets.
        """
        print ("Listing all available space rockets")
        return [
            "Ariane 5",
            "Falcon 9",
            "Atlas V"
        ]

    def buyFuel(self, fuel_type: str, quantity: int):
        """
        Buys a specific type of fuel and the quantity for the rocket.

        Args:
            fuel_type (str): The type of fuel, e.g., 'RP-1', 'Liquid Hydrogen', 'Hydrazine'.
            quantity (int): The quantity in kilograms.

        Returns:
            str: Confirmation message of the fuel purchase.
        """
        self.fuel_type = fuel_type
        self.fuel_quantity = quantity
        print(f"{quantity} kg of {fuel_type} fuel purchased.")
        return f"{quantity} kg of {fuel_type} fuel purchased."

    def buyFood(self, meals: str):
        """
        Buys a list of meals for the mission.

        Args:
            meals (str): Comma-separated list containing the names of meals.

        Returns:
            str: Confirmation message of the food purchase.
        """
        self.food_supplies = meals
        print(f"Food supplies purchased: {meals}")
        return f"Food supplies purchased: {meals}"

    def buySpaceRocket(self, rocket: str):
        """
        Selects a space rocket based on name and automatically sets appropriate fuel type,
        quantity, and estimated costs based on the rocket specifications.
        Falls back to default specifications for unknown rockets.
        """
        if rocket not in self.rocket_specs:
            print(f"Warning: No specifications found for {rocket}. Using default specifications.")
            self.selected_rocket = rocket
            specs = self.fallback_specs
            self.buyFuel(specs["fuel_type"], specs["fuel_quantity"])
            self.setEstimatedCosts(specs["cost"])
            return f"Rocket selected: {rocket} with default specs - {specs['fuel_type']} fuel and estimated cost of {specs['cost']}"

        specs = self.rocket_specs[rocket]
        self.selected_rocket = rocket
        self.buyFuel(specs["fuel_type"], specs["fuel_quantity"])
        self.setEstimatedCosts(specs["cost"])
        
        print(f"Rocket selected: {rocket}")
        return f"Rocket selected: {rocket} with {specs['fuel_type']} fuel and estimated cost of {specs['cost']}"

    def setEstimatedCosts(self, cost: str):
        """
        Sets the estimated costs for the mission.
        """
        self.estimated_cost = cost
        print(f"Estimated costs set to: {cost}")
        return f"Estimated costs set to: {cost}"

    def buySpacesuit(self, name: str):
        """
        Selects a spacesuit based on name.
        """
        self.selected_suit = name
        print(f"Spacesuit color selected: {name}")
        return f"Spacesuit color selected: {name}"

    def launchRocket(self):
        """
        Launches the selected rocket if all conditions are met.
        Make sure to have selected a launch site, rocket, estimated costs,
        spacesuit, food supplies, and fuel.
        """
        if self.selected_launch_site is None:
            print("Error: Launch site has not been selected.")
            return "Try again. Error: Launch site has not been selected."
        if self.selected_rocket is None:
            print("Error: Rocket has not been selected.")
            return "Try again. Error: Rocket has not been selected."
        if self.estimated_cost is None:
            print("Warning: Estimated costs have not been set.")
        if self.selected_suit is None:
            print("Error: Spacesuit has not been selected.")
            return "Try again. Error: Spacesuit has not been selected."
        if self.food_supplies is None:
            print("Error: Food supplies have not been purchased.")
            return "Try again. Error: Food supplies have not been purchased."
        if self.fuel_type is None or self.fuel_quantity is None:
            print("Error: Fuel has not been purchased.")
            return "Try again. Error: Fuel has not been purchased."
            
        self.launched = True
        return "Launching rocket..."
