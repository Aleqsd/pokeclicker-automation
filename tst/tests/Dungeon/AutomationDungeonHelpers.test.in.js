import "tst/utils/tests.utils.js";

// Minimal automation scaffolding so AutomationDungeon can bind safely
const automationMenuStub = {};
const automationNotificationsStub = {
    sendNotif: jest.fn(),
    sendWarningNotif: jest.fn()
};
const automationLocalStorageStub = {
    setDefaultValue: jest.fn(),
    getValue: jest.fn(),
    setValue: jest.fn(),
    unsetValue: jest.fn()
};

globalThis.Automation = {
    Utils: {
        LocalStorage: automationLocalStorageStub,
        Pokeball: { disableAutomationFilter: jest.fn(), catchEverythingWith: jest.fn() },
        isInstanceOf: (instance, className) => instance?.__className === className
    },
    Menu: automationMenuStub,
    Notifications: automationNotificationsStub,
    InitSteps: { BuildMenu: 0, Finalize: 1 }
};

globalThis.GameConstants = { GameState: { town: 0, dungeon: 1 } };
globalThis.App = { game: { gameState: GameConstants.GameState.town } };
globalThis.player = { town: null };

const dungeonCompletedMock = jest.fn();
globalThis.DungeonRunner = {
    dungeon: null,
    dungeonCompleted: dungeonCompletedMock
};

import "src/lib/Instances/Dungeon.js";

describe(`${AutomationTestUtils.categoryPrefix}AutomationDungeon helper selection`, () =>
{
    beforeEach(() =>
    {
        App.game.gameState = GameConstants.GameState.town;
        player.town = null;
        DungeonRunner.dungeon = null;
        dungeonCompletedMock.mockReset();
    });

    test("getCurrentDungeon returns null when no dungeon context is available", () =>
    {
        const result = AutomationDungeon.__internal__getCurrentDungeon();
        expect(result).toBeNull();
    });

    test("getCurrentDungeon returns the dungeon attached to the current town", () =>
    {
        const storedDungeon = { name: "Test Tunnel" };
        player.town = { __className: "DungeonTown", dungeon: storedDungeon };

        const result = AutomationDungeon.__internal__getCurrentDungeon();
        expect(result).toBe(storedDungeon);
    });

    test("getCurrentDungeon prioritizes the active dungeon run", () =>
    {
        const runningDungeon = { name: "Active Run" };
        DungeonRunner.dungeon = runningDungeon;
        App.game.gameState = GameConstants.GameState.dungeon;

        player.town = { __className: "DungeonTown", dungeon: { name: "Town Dungeon" } };

        const result = AutomationDungeon.__internal__getCurrentDungeon();
        expect(result).toBe(runningDungeon);
    });
});

describe(`${AutomationTestUtils.categoryPrefix}AutomationDungeon shiny completion helper`, () =>
{
    beforeEach(() =>
    {
        App.game.gameState = GameConstants.GameState.town;
        player.town = null;
        DungeonRunner.dungeon = null;
        dungeonCompletedMock.mockReset();
    });

    test("isDungeonShinyCompleted returns false when no dungeon is available", () =>
    {
        const result = AutomationDungeon.__internal__isDungeonShinyCompleted();
        expect(result).toBe(false);
        expect(dungeonCompletedMock).not.toHaveBeenCalled();
    });

    test("isDungeonShinyCompleted delegates to DungeonRunner with the shiny flag", () =>
    {
        App.game.gameState = GameConstants.GameState.dungeon;
        const runningDungeon = { name: "Dungeon Prime" };
        DungeonRunner.dungeon = runningDungeon;
        dungeonCompletedMock.mockReturnValue(true);

        const result = AutomationDungeon.__internal__isDungeonShinyCompleted();
        expect(result).toBe(true);
        expect(dungeonCompletedMock).toHaveBeenCalledWith(runningDungeon, true);
    });
});
