/**
 * @class AutomationBattleItems automates the usage of battle items
 *
 * It supports:
 *   - X Attack
 *   - X Click
 *   - Lucky Egg
 *   - Token Collector
 *   - Dowsing Machine
 *   - Lucky Incense
 */
class AutomationBattleItems
{
    static Settings = {
                          FeatureEnabled: "BattleItems-Enabled",
                          UseAmount: "BattleItems-UseAmount"
                      };

    /**
     * @brief Builds the menu and restores previous state if needed
     *
     * @param initStep: The current automation init step
     */
    static initialize(initStep)
    {
        if (initStep == Automation.InitSteps.BuildMenu)
        {
            Automation.Utils.LocalStorage.setDefaultValue(this.Settings.UseAmount, this.__internal__defaultUseAmount);
            this.__internal__buildMenu();
            this.__internal__updateMenuVisibility();
        }
        else if (initStep == Automation.InitSteps.Finalize)
        {
            this.__internal__toggleAutoBattleItems();
            this.__internal__updateMenuVisibility();
            this.__internal__setChallengeWatcher();
        }
    }

    /*********************************************************************\
    |***    Internal members, should never be used by other classes    ***|
    \*********************************************************************/

    static __internal__defaultUseAmount = 10;
    static __internal__loopIntervalMs = 2000;
    static __internal__activationThresholdSeconds = GameConstants.ITEM_USE_TIME; // Reapply when <= 30s left

    static __internal__battleItemTypes = [
        GameConstants.BattleItemType.xAttack,
        GameConstants.BattleItemType.xClick,
        GameConstants.BattleItemType.Lucky_egg,
        GameConstants.BattleItemType.Token_collector,
        GameConstants.BattleItemType.Dowsing_machine,
        GameConstants.BattleItemType.Lucky_incense
    ];

    static __internal__container = null;
    static __internal__amountSelect = null;
    static __internal__autoUseLoop = null;
    static __internal__challengeWatcher = null;

    /**
     * @brief Builds the menu UI
     */
    static __internal__buildMenu()
    {
        this.__internal__container = document.createElement("div");
        Automation.Menu.AutomationButtonsDiv.appendChild(this.__internal__container);

        Automation.Menu.addSeparator(this.__internal__container);

        const tooltip = "Automatically keeps battle items active by reusing them when their timer runs low."
                      + Automation.Menu.TooltipSeparator
                      + "Advanced settings let you pick whether to refresh with x10 or x100 items.";
        const toggleButton =
            Automation.Menu.addAutomationButton("Battle Items", this.Settings.FeatureEnabled, tooltip, this.__internal__container);
        toggleButton.addEventListener("click", this.__internal__toggleAutoBattleItems.bind(this), false);

        const settingsPanel = Automation.Menu.addSettingPanel(this.__internal__container);

        const panelTitle = Automation.Menu.createTitleElement("Battle item settings");
        panelTitle.style.marginBottom = "8px";
        settingsPanel.appendChild(panelTitle);

        const amountRow = document.createElement("div");
        amountRow.style.display = "inline-flex";
        amountRow.style.alignItems = "center";
        amountRow.style.width = "100%";
        amountRow.style.paddingLeft = "5px";
        amountRow.style.paddingRight = "5px";
        settingsPanel.appendChild(amountRow);

        const amountLabel = document.createElement("span");
        amountLabel.textContent = "Refresh with";
        amountLabel.style.paddingRight = "6px";
        amountRow.appendChild(amountLabel);

        amountRow.classList.add("hasAutomationTooltip");
        amountRow.setAttribute("automation-tooltip-text", "Pick how many items should be activated each time the automation refreshes the buff.");

        this.__internal__amountSelect = Automation.Menu.createDropDownListElement("BattleItems-UseAmountSelect");
        this.__internal__amountSelect.style.width = "120px";

        this.__internal__addAmountOption(10);
        this.__internal__addAmountOption(100);

        const storedAmount = this.__internal__getStoredUseAmount();
        this.__internal__amountSelect.value = storedAmount.toString();

        this.__internal__amountSelect.onchange = function(event)
            {
                const newValue = Automation.Utils.tryParseInt(event.target.value, this.__internal__defaultUseAmount);
                const sanitizedValue = (newValue === 100) ? 100 : 10;
                Automation.Utils.LocalStorage.setValue(this.Settings.UseAmount, sanitizedValue);
            }.bind(this);

        amountRow.appendChild(this.__internal__amountSelect);

        const amountSuffix = document.createElement("span");
        amountSuffix.textContent = "items";
        amountSuffix.style.paddingLeft = "6px";
        amountRow.appendChild(amountSuffix);
    }

    /**
     * @brief Adds an option to the use-amount select control
     *
     * @param {number} amount: The amount to append
     */
    static __internal__addAmountOption(amount)
    {
        const option = document.createElement("option");
        option.value = amount.toString();
        option.textContent = `x${amount}`;
        this.__internal__amountSelect.appendChild(option);
    }

    /**
     * @brief Starts or stops the auto-use loop
     *
     * If no boolean is provided, the stored local storage value will be used.
     *
     * @param enable: [Optional] Explicit new state
     */
    static __internal__toggleAutoBattleItems(enable)
    {
        if ((enable !== true) && (enable !== false))
        {
            enable = (Automation.Utils.LocalStorage.getValue(this.Settings.FeatureEnabled) === "true");
        }

        // Never run when the challenge disables battle items
        if (this.__internal__isBattleItemChallengeActive())
        {
            enable = false;
        }

        if (enable)
        {
            if (this.__internal__autoUseLoop === null)
            {
                this.__internal__autoUseLoop =
                    setInterval(this.__internal__runAutoBattleItems.bind(this), this.__internal__loopIntervalMs);
                this.__internal__runAutoBattleItems();
            }
        }
        else
        {
            clearInterval(this.__internal__autoUseLoop);
            this.__internal__autoUseLoop = null;
        }
    }

    /**
     * @brief Runs the battle items refresh loop
     */
    static __internal__runAutoBattleItems()
    {
        if (this.__internal__isBattleItemChallengeActive())
        {
            this.__internal__toggleAutoBattleItems(false);
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
            return;
        }

        const amountToUse = this.__internal__getStoredUseAmount();

        for (const itemName of this.__internal__battleItemTypes)
        {
            const playerItemEntry = player.itemList[itemName];
            const effectEntry = player.effectList[itemName];
            if (!playerItemEntry || !effectEntry)
            {
                continue;
            }

            if (playerItemEntry() < amountToUse)
            {
                continue;
            }

            if (effectEntry() > this.__internal__activationThresholdSeconds)
            {
                continue;
            }

            ItemHandler.useItem(itemName, amountToUse);
        }
    }

    /**
     * @brief Updates the menu visibility based on the current challenge configuration
     */
    static __internal__updateMenuVisibility()
    {
        if (!this.__internal__container)
        {
            return;
        }

        const shouldHide = this.__internal__isBattleItemChallengeActive();
        this.__internal__container.hidden = shouldHide;

        if (shouldHide)
        {
            this.__internal__toggleAutoBattleItems(false);
            Automation.Menu.forceAutomationState(this.Settings.FeatureEnabled, false);
        }
    }

    /**
     * @brief Sets a watcher reacting to challenge configuration changes impacting battle items
     */
    static __internal__setChallengeWatcher()
    {
        if (this.__internal__challengeWatcher !== null)
        {
            return;
        }

        this.__internal__challengeWatcher = setInterval(function()
            {
                this.__internal__updateMenuVisibility();
            }.bind(this), 10000); // Check every 10 seconds
    }

    /**
     * @brief Retrieves the stored use amount value
     *
     * @returns 10 or 100 (defaults to 10)
     */
    static __internal__getStoredUseAmount()
    {
        const stored = Automation.Utils.tryParseInt(Automation.Utils.LocalStorage.getValue(this.Settings.UseAmount), this.__internal__defaultUseAmount);
        return (stored === 100) ? 100 : 10;
    }

    /**
     * @brief Checks if the "disable battle items" challenge is active
     *
     * @returns True if the challenge is active, false otherwise
     */
    static __internal__isBattleItemChallengeActive()
    {
        return App.game?.challenges?.list?.disableBattleItems?.active() === true;
    }
}
