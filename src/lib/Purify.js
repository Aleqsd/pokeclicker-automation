/**
 * @class The AutomationPurify regroups the 'Purify Chamber' automation functionalities
 */
class AutomationPurify
{
    static Settings = {
                          FeatureEnabled: "Purify-Enabled"
                      };

    /**
     * @brief Builds the menu, and restores previous running state if needed
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.FeatureEnabled, false);
            this.__internal__buildMenu();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            this.toggleAutoPurify();
        }
    }

    /**
     * @brief Toggles the 'Purify Chamber' feature
     *
     * If the feature was enabled and it's toggled to disabled, the loop will be stopped.
     * If the feature was disabled and it's toggled to enabled, the loop will be started.
     *
     * @param enable: [Optional] If a boolean is passed, it will be used to set the right state.
     *                Otherwise, the local storage value will be used
     */
    static toggleAutoPurify(enable)
    {
        if (!this.__internal__canAccessPurifyChamber())
        {
            this.__internal__stopPurifyLoop();
            this.__internal__disableUntilUnlocked();
            return;
        }

        // If we got the click event, use the button status
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        if (enable)
        {
            // Only set a loop if there is none active
            if (this.__internal__autoPurifyLoop === null)
            {
                this.__internal__autoPurifyLoop = setInterval(this.__internal__purifyLoop.bind(this), 1000); // Runs every second
                this.__internal__purifyLoop();
            }
        }
        else
        {
            this.__internal__stopPurifyLoop();
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__autoPurifyLoop = null;
    static __internal__container = null;
    static __internal__toggleButton = null;
    static __internal__unlockWatcher = null;

    /**
     * @brief Builds the menu
     */
    static __internal__buildMenu()
    {
        this.__internal__container = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__container);

        Automation.Menu.addSeparator(this.__internal__container);

        const autoPurifyTooltip = "Automatically purifies the selected pokémon whenever the Purify Chamber reaches max flow."
                                + Automation.Menu.TooltipSeparator
                                + "Requires the Purify Chamber to be unlocked and a pokémon selected in the chamber.";
        this.__internal__toggleButton =
            Automation.Menu.addAutomationButton("Purify", this.Settings.FeatureEnabled, autoPurifyTooltip, this.__internal__container);
        this.__internal__toggleButton.addEventListener("click", this.toggleAutoPurify.bind(this), false);

        const isAccessible = this.__internal__canAccessPurifyChamber();
        this.__internal__container.hidden = !isAccessible;
        this.__internal__toggleButton.disabled = !isAccessible;

        if (!isAccessible)
        {
            this.__internal__setUnlockWatcher();
        }
    }

    /**
     * @brief Automatically purifies the selected pokémon when possible
     */
    static __internal__purifyLoop()
    {
        if (!this.__internal__canAccessPurifyChamber())
        {
            this.toggleAutoPurify(false);
            return;
        }

        const purifyChamber = App.game?.purifyChamber;
        if (!purifyChamber)
        {
            return;
        }

        const canPurifyFn = purifyChamber.canPurify;
        const canPurify = (typeof canPurifyFn === "function") ? canPurifyFn.call(purifyChamber) : false;

        if (!canPurify)
        {
            return;
        }

        const purifyFn = purifyChamber.purify;
        if (typeof purifyFn === "function")
        {
            purifyFn.call(purifyChamber);
        }
    }

    /**
     * @brief Stops the auto-purify loop if needed
     */
    static __internal__stopPurifyLoop()
    {
        clearInterval(this.__internal__autoPurifyLoop);
        this.__internal__autoPurifyLoop = null;
    }

    /**
     * @brief Disables the toggle until the chamber is unlocked
     */
    static __internal__disableUntilUnlocked()
    {
        if (this.__internal__toggleButton === null)
        {
            return;
        }

        this.__internal__toggleButton.disabled = true;
        if (this.__internal__container !== null)
        {
            this.__internal__container.hidden = true;
        }

        this.__internal__setUnlockWatcher();
    }

    /**
     * @brief Watches for the Purify Chamber unlock to re-enable the automation
     */
    static __internal__setUnlockWatcher()
    {
        if (this.__internal__unlockWatcher !== null)
        {
            return;
        }

        this.__internal__unlockWatcher = setInterval(function()
            {
                if (!this.__internal__canAccessPurifyChamber())
                {
                    return;
                }

                clearInterval(this.__internal__unlockWatcher);
                this.__internal__unlockWatcher = null;

                if (this.__internal__container !== null)
                {
                    this.__internal__container.hidden = false;
                }

                if (this.__internal__toggleButton !== null)
                {
                    this.__internal__toggleButton.disabled = false;
                }

                this.toggleAutoPurify();
            }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief Checks if the Purify Chamber can currently be accessed
     *
     * @returns True if the chamber can be interacted with, false otherwise
     */
    static __internal__canAccessPurifyChamber()
    {
        const purifyChamber = App.game?.purifyChamber;

        if (!purifyChamber)
        {
            return false;
        }

        if (typeof purifyChamber.canAccess === "function")
        {
            return purifyChamber.canAccess();
        }

        if (typeof purifyChamber.isUnlocked === "function")
        {
            return purifyChamber.isUnlocked();
        }

        if (typeof purifyChamber.isUnlocked === "boolean")
        {
            return purifyChamber.isUnlocked;
        }

        return true;
    }
}
