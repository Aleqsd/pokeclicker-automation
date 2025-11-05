/**
 * @class The AutomationFocusBattleFrontier regroups the 'Focus on' button's 'Battle Frontier' functionalities
 */
class AutomationFocusBattleFrontier
{
    /******************************************************************************\
    |***    Focus specific members, should only be used by focus sub-classes    ***|
    \******************************************************************************/

    static __internal__battleFrontierLoop = null;
    static __internal__battleFrontierTownName = "Battle Frontier";

    /**
     * @brief Adds the 'Battle Frontier' functionality to the 'Focus on' list
     *
     * @param {Array} functionalitiesList: The list to add the functionality to
     */
    static __registerFunctionalities(functionalitiesList)
    {
        const isUnlockedCallback = function()
            {
                const town = TownList[this.__internal__battleFrontierTownName];
                return town && town.isUnlocked();
            }.bind(this);

        functionalitiesList.push(
            {
                id: "BattleFrontier",
                name: "Battle Frontier",
                tooltip: "Runs the Battle Frontier automatically"
                       + Automation.Menu.TooltipSeparator
                       + "Travels to the Battle Frontier, enters it\n"
                       + "and keeps the auto-start loop enabled.",
                run: function() { this.__internal__start(); }.bind(this),
                stop: function() { this.__internal__stop(); }.bind(this),
                isUnlocked: isUnlockedCallback,
                refreshRateAsMs: Automation.Focus.__noFunctionalityRefresh
            });
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    /**
     * @brief Starts the Battle Frontier automation
     */
    static __internal__start()
    {
        if (this.__internal__battleFrontierLoop !== null)
        {
            return;
        }

        this.__internal__battleFrontierLoop =
            setInterval(this.__internal__focusOnBattleFrontier.bind(this), 1000); // Runs every second
        this.__internal__focusOnBattleFrontier();
    }

    /**
     * @brief Stops the Battle Frontier automation
     */
    static __internal__stop()
    {
        clearInterval(this.__internal__battleFrontierLoop);
        this.__internal__battleFrontierLoop = null;

        Automation.Menu.forceAutomationState(Automation.BattleFrontier.Settings.FeatureEnabled, false);
    }

    /**
     * @brief The Battle Frontier focus main loop
     */
    static __internal__focusOnBattleFrontier()
    {
        const isInBattleFrontier = (App.game.gameState === GameConstants.GameState.battleFrontier);

        if (!isInBattleFrontier)
        {
            if (!Automation.Focus.__ensureNoInstanceIsInProgress())
            {
                return;
            }

            const battleFrontierTown = TownList[this.__internal__battleFrontierTownName];

            if (!battleFrontierTown || !battleFrontierTown.isUnlocked())
            {
                Automation.Menu.forceAutomationState(Automation.Focus.Settings.FeatureEnabled, false);
                Automation.Notifications.sendWarningNotif("Battle Frontier is not unlocked yet.\nTurning the feature off", "Focus");
                return;
            }

            if (!Automation.Utils.Route.isPlayerInTown(this.__internal__battleFrontierTownName))
            {
                Automation.Utils.Route.moveToTown(this.__internal__battleFrontierTownName);
                return;
            }

            App.game.battleFrontier.enter();
            return;
        }

        Automation.Menu.forceAutomationState(Automation.Dungeon.Settings.FeatureEnabled, false);
        Automation.Menu.forceAutomationState(Automation.Gym.Settings.FeatureEnabled, false);

        Automation.Menu.forceAutomationState(Automation.BattleFrontier.Settings.FeatureEnabled, true);

        if (!BattleFrontierRunner.started())
        {
            BattleFrontierRunner.start(true);
        }
    }
}
