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

globalThis.GameConstants = {
    GameState: { town: 0, dungeon: 1 },
    ShadowStatus: { None: 0, Shadow: 1 }
};
const getPokemonByNameMock = jest.fn();
globalThis.App = { game: { gameState: GameConstants.GameState.town, party: { getPokemonByName: getPokemonByNameMock } } };
globalThis.player = { town: null };
globalThis.TownList = {};

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
        getPokemonByNameMock.mockReset();
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

describe(`${AutomationTestUtils.categoryPrefix}AutomationDungeon shiny restart count helpers`, () =>
{
    beforeEach(() =>
    {
        App.game.gameState = GameConstants.GameState.town;
        player.town = null;
        DungeonRunner.dungeon = null;
        getPokemonByNameMock.mockReset();
        for (const key of Object.keys(TownList))
        {
            delete TownList[key];
        }
        AutomationDungeon.__internal__shinyRestartLabelSpan = null;
    });

    test("getCatchablePokemonList filters encounter types that cannot be caught", () =>
    {
        const lockedRequirement = { isCompleted: jest.fn().mockReturnValue(false) };
        const unlockedRequirement = { isCompleted: jest.fn().mockReturnValue(true) };
        const dungeon = {
            name: "Shiny Cavern",
            normalEncounterList: [
                { pokemonName: "Zubat" },
                { pokemonName: "HiddenMon", hide: true },
                { pokemonName: "TrainerOnly", shadowTrainer: true },
                { pokemonName: "TrickyMon", mimic: true },
                { pokemonName: "LockedMon", options: { requirement: lockedRequirement } },
                { pokemonName: "UnlockedMon", options: { requirement: unlockedRequirement } },
                { __className: "DungeonTrainer", name: "TrainerGuy" }
            ],
            bossList: [
                { __className: "DungeonBossPokemon", name: "BossMon" },
                { __className: "DungeonBossPokemon", name: "LockedBoss", options: { requirement: lockedRequirement } },
                {
                    __className: "DungeonTrainer",
                    team: [
                        { name: "ShadowMon", shadow: GameConstants.ShadowStatus.Shadow },
                        { name: "TrainerMon", shadow: GameConstants.ShadowStatus.None }
                    ]
                }
            ]
        };
        TownList[dungeon.name] = { region: GameConstants.Region.kanto };

        const catchable = AutomationDungeon.__internal__getCatchablePokemonList(dungeon);
        expect(catchable).toEqual(expect.arrayContaining(["Zubat", "BossMon", "ShadowMon", "UnlockedMon"]));
        expect(catchable).not.toEqual(expect.arrayContaining([
            "HiddenMon",
            "TrainerOnly",
            "TrickyMon",
            "TrainerMon",
            "TrainerGuy",
            "LockedBoss",
            "LockedMon"
        ]));
    });

    test("getCatchablePokemonList leverages the dungeon availability helper when present", () =>
    {
        const dungeon = {
            name: "Helper Cavern",
            allAvailablePokemon: jest.fn().mockReturnValue([
                "Zubat",
                { pokemonName: "BossMon" },
                { pokemon: { name: "ShadowMon" } },
                null,
                "Zubat"
            ])
        };

        const catchable = AutomationDungeon.__internal__getCatchablePokemonList(dungeon);

        expect(dungeon.allAvailablePokemon).toHaveBeenCalledWith(true);
        expect(catchable).toEqual(["Zubat", "BossMon", "ShadowMon"]);
    });

    test("refreshShinyRestartLabel reports the captured shiny ratio", () =>
    {
        const dungeon = {
            name: "Shiny Cavern",
            normalEncounterList: [
                { pokemonName: "CaughtMon" },
                { pokemonName: "MissingMon" }
            ],
            bossList: []
        };
        TownList[dungeon.name] = { region: 0 };
        player.town = { __className: "DungeonTown", dungeon };
        const labelStub = { textContent: "" };
        AutomationDungeon.__internal__shinyRestartLabelSpan = labelStub;
        getPokemonByNameMock.mockImplementation((pokemonName) =>
            {
                if (pokemonName === "CaughtMon")
                {
                    return { shiny: true };
                }

                return { shiny: false };
            });

        AutomationDungeon.__internal__refreshShinyRestartLabel();

        expect(labelStub.textContent).toBe("1/2");
    });
});
