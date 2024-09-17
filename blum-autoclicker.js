// ==UserScript==
// @name         Blum AutoClicker
// @version      1.5
// @namespace    http://tampermonkey.net/
// @description  An autoclicker script for the Blum game with configurable settings.
// @author       serhiishtokal
// @match        https://telegram.blum.codes/*
// @grant        none
// @icon         https://cdn.prod.website-files.com/65b6a1a4a0e2af577bccce96/65ba99c1616e21b24009b86c_blum-256.png
// @downloadURL  https://github.com/serhiishtokal/BlumAutoclicker/raw/main/blum-autoclicker.js
// @updateURL    https://github.com/serhiishtokal/BlumAutoclicker/raw/main/blum-autoclicker.js
// @homepage     https://github.com/serhiishtokal/BlumAutoclicker
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Blum Autoclicker Script
     *
     * Automates clicking actions in the Blum game with customizable settings.
     */

        // Default settings
    const DEFAULT_SETTINGS = {
            minBombHits: getRandomInt(0, 1),
            minIceHits: getRandomInt(2, 3),
            flowerSkipPercentage: getRandomInt(15, 25),
            badGamesPercentage: 10,
            badGameFlowerSkipPercentageMultiplier: 5,
            minDelayMs: 2000,
            maxDelayMs: 5000,
            autoClickPlay: false,
            autoClickPlayDuration: 1800, // Duration in seconds (0 = infinite)
        };

    let gameSettings = { ...DEFAULT_SETTINGS };
    let isGamePaused = false;
    let autoClickPlayTimer = null;
    let gameStats = resetGameStats();
    let isBadGame = 0;
    let actualFlowerSkipPercentage = gameSettings.flowerSkipPercentage;

    init();

    /**
     * Initializes the script by setting up observers, loading settings, and starting timers.
     */
    function init() {
        try {
            loadSettings();
            setupMutationObserver();
            setupPlayButtonChecker();
            setupSettingsMenu();
            setupAutoClaimAndStart();

            if (gameSettings.autoClickPlay) {
                startAutoClickPlayTimer();
            }
        } catch (error) {
            console.error('Blum Autoclicker error:', error);
        }
    }

    /**
     * Resets the game statistics.
     * @returns {Object} The reset game statistics object.
     */
    function resetGameStats() {
        return {
            score: 0,
            bombHits: 0,
            iceHits: 0,
            flowersSkipped: 0,
            isGameOver: false,
        };
    }

    /**
     * Sets up a mutation observer to monitor game state changes.
     */
    function setupMutationObserver() {
        const observer = new MutationObserver(handleMutations);
        const appElement = document.querySelector('#app');
        if (appElement) {
            observer.observe(appElement, { childList: true, subtree: true });
        }
    }

    /**
     * Mutation observer callback to handle game state changes.
     * @param {MutationRecord[]} mutations - Array of mutation records.
     */
    function handleMutations(mutations) {
        for (const mutation of mutations) {
            if (mutation.type === 'childList') {
                checkGameCompletion();
            }
        }
    }

    /**
     * Checks if the game has completed and handles post-game logic.
     */
    function checkGameCompletion() {
        const rewardElement = document.querySelector('#app > div > div > div.content > div.reward');
        if (rewardElement && !gameStats.isGameOver) {
            gameStats.isGameOver = true;
            // Game over, no need to reset gameStats here since we reset it when a new game starts
        }
    }

    /**
     * Sets up an interval to check and click the play button when appropriate.
     */
    function setupPlayButtonChecker() {
        setInterval(() => {
            if (!isGamePaused) {
                checkAndClickPlayButton();
            }
        }, 1000);
    }

    /**
     * Checks for the play button and clicks it if conditions are met.
     */
    function checkAndClickPlayButton() {
        if (!gameSettings.autoClickPlay) return;

        const playButtons = document.querySelectorAll(
            'button.kit-button.is-large.is-primary, a.play-btn[href="/game"], button.kit-button.is-large.is-primary'
        );

        playButtons.forEach((button) => {
            if (/Play|Continue/.test(button.textContent)) {
                setTimeout(() => {
                    if (gameSettings.autoClickPlay && !isGamePaused) {
                        button.click();
                        isBadGame = Math.random() < gameSettings.badGamesPercentage /100;
                        actualFlowerSkipPercentage = gameSettings.flowerSkipPercentage * getRandomInt(70,400)/100;
                        gameStats = resetGameStats(); // Reset game stats when a new game starts
                        if (autoClickPlayTimerExpired()) {
                            gameSettings.autoClickPlay = false;
                            updateSettingsMenu();
                        }
                    }
                }, getRandomDelay());
            }
        });
    }

    /**
     * Gets a random delay between minDelayMs and maxDelayMs.
     * @returns {number} The random delay in milliseconds.
     */
    function getRandomDelay() {
        return getRandomInt(gameSettings.minDelayMs, gameSettings.maxDelayMs);
    }

    /**
     * Sets up the settings menu UI.
     */
    function setupSettingsMenu() {
        const settingsMenu = createSettingsMenu();
        document.body.appendChild(settingsMenu);

        const settingsButton = createSettingsButton(settingsMenu);
        document.body.appendChild(settingsButton);
    }

    /**
     * Creates the settings menu element.
     * @returns {HTMLElement} The settings menu element.
     */
    function createSettingsMenu() {
        const settingsMenu = document.createElement('div');
        settingsMenu.className = 'settings-menu';
        settingsMenu.style.display = 'none';

        const menuTitle = createMenuTitle();
        settingsMenu.appendChild(menuTitle);

        const settingsList = createSettingsList();
        settingsMenu.appendChild(settingsList);

        const pauseResumeButton = createPauseResumeButton();
        settingsMenu.appendChild(pauseResumeButton);

        const socialButtons = createSocialButtons();
        settingsMenu.appendChild(socialButtons);

        injectStyles();
        return settingsMenu;
    }

    /**
     * Creates the menu title element with a close button.
     * @returns {HTMLElement} The menu title element.
     */
    function createMenuTitle() {
        const menuTitle = document.createElement('h3');
        menuTitle.className = 'settings-title';
        menuTitle.textContent = 'Blum Autoclicker';

        const closeButton = document.createElement('button');
        closeButton.className = 'settings-close-button';
        closeButton.textContent = '×';
        closeButton.onclick = () => {
            menuTitle.parentElement.style.display = 'none';
        };

        menuTitle.appendChild(closeButton);
        return menuTitle;
    }

    /**
     * Creates the settings list with all configurable options.
     * @returns {HTMLElement} The settings list element.
     */
    function createSettingsList() {
        const settingsList = document.createElement('div');

        const settingsElements = [
            {
                label: 'Flower Skip (%)',
                id: 'flowerSkipPercentage',
                type: 'range',
                min: 0,
                max: 100,
                step: 1,
                tooltip: 'Percentage probability of skipping a flower.',
            },
            {
                label: 'Min Freeze Hits',
                id: 'minIceHits',
                type: 'range',
                min: 1,
                max: 10,
                step: 1,
                tooltip: 'Minimum number of clicks per freeze.',
            },
            {
                label: 'Min Bomb Hits',
                id: 'minBombHits',
                type: 'range',
                min: 0,
                max: 10,
                step: 1,
                tooltip: 'Minimum number of clicks per bomb.',
            },
            {
                label: 'Min Delay (ms)',
                id: 'minDelayMs',
                type: 'range',
                min: 10,
                max: 10000,
                step: 10,
                tooltip: 'Minimum delay between clicks.',
            },
            {
                label: 'Max Delay (ms)',
                id: 'maxDelayMs',
                type: 'range',
                min: 10,
                max: 10000,
                step: 10,
                tooltip: 'Maximum delay between clicks.',
            },
            {
                label: 'Auto Click Play',
                id: 'autoClickPlay',
                type: 'checkbox',
                tooltip: 'Automatically start the next game when the current one ends.',
            },
            {
                label: 'Auto Click Play Duration (sec)',
                id: 'autoClickPlayDuration',
                type: 'number',
                min: 0,
                max: 86400,
                step: 1,
                tooltip: 'Duration in seconds for auto-clicking play button. 0 means infinite.',
            },
        ];

        settingsElements.forEach((setting) => {
            const settingElement = createSettingElement(setting);
            settingsList.appendChild(settingElement);
        });

        return settingsList;
    }

    /**
     * Creates an individual setting element.
     * @param {Object} setting - The setting configuration.
     * @returns {HTMLElement} The setting element.
     */
    function createSettingElement({ label, id, type, min, max, step, tooltip }) {
        const container = document.createElement('div');
        container.className = 'setting-item';

        const labelContainer = document.createElement('div');
        labelContainer.className = 'setting-label';

        const labelText = document.createElement('span');
        labelText.className = 'setting-label-text';
        labelText.textContent = label;

        const helpIcon = document.createElement('span');
        helpIcon.textContent = '?';
        helpIcon.className = 'help-icon tooltip';
        const tooltipText = document.createElement('span');
        tooltipText.className = 'tooltiptext';
        tooltipText.innerHTML = tooltip;
        helpIcon.appendChild(tooltipText);

        labelContainer.appendChild(labelText);
        labelContainer.appendChild(helpIcon);

        const inputContainer = document.createElement('div');
        inputContainer.className = 'setting-input';

        let input;
        if (type === 'checkbox') {
            input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = gameSettings[id];
            input.id = id;
            input.onchange = () => handleSettingChange(id, input.checked);
            inputContainer.appendChild(input);
        } else {
            input = document.createElement('input');
            input.type = type;
            input.min = min;
            input.max = max;
            input.step = step;
            input.value = gameSettings[id];
            input.id = id;
            input.oninput = () => handleSettingChange(id, input.value);
            input.className = 'setting-slider';

            const valueDisplay = document.createElement('span');
            valueDisplay.id = `${id}Display`;
            valueDisplay.textContent = gameSettings[id];
            valueDisplay.className = 'setting-value';

            inputContainer.appendChild(input);
            inputContainer.appendChild(valueDisplay);
        }

        container.appendChild(labelContainer);
        container.appendChild(inputContainer);

        return container;
    }

    /**
     * Handles changes to settings, updates gameSettings, and saves to local storage.
     * @param {string} id - The setting ID.
     * @param {string|number|boolean} value - The new value.
     */
    function handleSettingChange(id, value) {
        if (typeof gameSettings[id] === 'boolean') {
            gameSettings[id] = value;
        } else {
            gameSettings[id] = parseFloat(value);
            const valueDisplay = document.getElementById(`${id}Display`);
            if (valueDisplay) {
                valueDisplay.textContent = value;
            }
        }
        saveSettings();

        if (id === 'autoClickPlay') {
            if (gameSettings.autoClickPlay) {
                startAutoClickPlayTimer();
            } else {
                stopAutoClickPlayTimer();
            }
        } else if (id === 'autoClickPlayDuration' && gameSettings.autoClickPlay) {
            startAutoClickPlayTimer();
        }
    }

    /**
     * Creates the pause/resume button.
     * @returns {HTMLElement} The pause/resume button element.
     */
    function createPauseResumeButton() {
        const button = document.createElement('button');
        button.textContent = 'Pause';
        button.className = 'pause-resume-btn';
        button.onclick = toggleGamePause;
        return button;
    }

    /**
     * Toggles the game pause state.
     */
    function toggleGamePause() {
        isGamePaused = !isGamePaused;
        const button = document.querySelector('.pause-resume-btn');
        button.textContent = isGamePaused ? 'Resume' : 'Pause';
        button.style.backgroundColor = isGamePaused ? '#e5c07b' : '#98c379';

        if (isGamePaused) {
            stopAutoClickPlayTimer();
        } else if (gameSettings.autoClickPlay) {
            startAutoClickPlayTimer();
        }
    }

    /**
     * Creates the settings button that toggles the settings menu.
     * @param {HTMLElement} settingsMenu - The settings menu element.
     * @returns {HTMLElement} The settings button element.
     */
    function createSettingsButton(settingsMenu) {
        const button = document.createElement('button');
        button.className = 'settings-button';
        button.textContent = '⚙️';
        button.onclick = () => {
            settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
            updateSettingsMenu();
        };
        return button;
    }

    /**
     * Updates the settings menu UI to reflect current settings.
     */
    function updateSettingsMenu() {
        const settings = [
            'flowerSkipPercentage',
            'minIceHits',
            'minBombHits',
            'minDelayMs',
            'maxDelayMs',
            'autoClickPlay',
            'autoClickPlayDuration',
        ];

        settings.forEach((id) => {
            const input = document.getElementById(id);
            if (input) {
                if (typeof gameSettings[id] === 'boolean') {
                    input.checked = gameSettings[id];
                } else {
                    input.value = gameSettings[id];
                    const valueDisplay = document.getElementById(`${id}Display`);
                    if (valueDisplay) {
                        valueDisplay.textContent = gameSettings[id];
                    }
                }
            }
        });
    }

    /**
     * Injects necessary styles into the document.
     */
    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
      /* Styles for the settings menu and buttons */
      .settings-menu {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(40, 44, 52, 0.95);
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        color: #abb2bf;
        font-family: 'Arial', sans-serif;
        z-index: 10000;
        padding: 20px;
        width: 320px;
      }
      .settings-title {
        color: #61afef;
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .settings-close-button {
        background: none;
        border: none;
        color: #e06c75;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
      }
      .setting-item {
        margin-bottom: 12px;
      }
      .setting-label {
        display: flex;
        align-items: center;
        margin-bottom: 4px;
      }
      .setting-label-text {
        color: #e5c07b;
        margin-right: 5px;
      }
      .help-icon {
        cursor: help;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: #61afef;
        color: #282c34;
        font-size: 10px;
        font-weight: bold;
        position: relative;
      }
      .help-icon .tooltiptext {
        visibility: hidden;
        width: 200px;
        background-color: #4b5263;
        color: #fff;
        text-align: left;
        border-radius: 6px;
        padding: 5px;
        position: absolute;
        z-index: 10001;
        bottom: 125%;
        left: 50%;
        margin-left: -100px;
        opacity: 0;
        transition: opacity 0.3s;
        font-size: 11px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      .help-icon:hover .tooltiptext {
        visibility: visible;
        opacity: 1;
      }
      .setting-input {
        display: flex;
        align-items: center;
      }
      .setting-slider {
        flex-grow: 1;
        margin-right: 8px;
      }
      .setting-value {
        min-width: 30px;
        text-align: right;
        font-size: 11px;
      }
      .pause-resume-btn {
        display: block;
        width: calc(100% - 10px);
        padding: 8px;
        margin: 15px 5px;
        background-color: #98c379;
        color: #282c34;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        transition: background-color 0.3s;
      }
      .pause-resume-btn:hover {
        background-color: #7cb668;
      }
      .settings-button {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: rgba(36, 146, 255, 0.8);
        color: #fff;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 18px;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        z-index: 9999;
      }
      .social-buttons {
        margin-top: 15px;
        display: flex;
        justify-content: space-between;
        white-space: nowrap;
      }
      .social-button {
        display: inline-flex;
        align-items: center;
        padding: 5px 8px;
        border-radius: 4px;
        background-color: #282c34;
        color: #abb2bf;
        text-decoration: none;
        font-size: 12px;
        transition: background-color 0.3s;
      }
      .social-button:hover {
        background-color: #4b5263;
      }
      .social-button img {
        width: 16px;
        height: 16px;
        margin-right: 5px;
      }
    `;
        document.head.appendChild(style);
    }

    /**
     * Creates social buttons (e.g., GitHub, Telegram, Donate).
     * @returns {HTMLElement} The social buttons container.
     */
    function createSocialButtons() {
        const container = document.createElement('div');
        container.className = 'social-buttons';

        // GitHub Button
        const githubButton = document.createElement('a');
        githubButton.href = 'https://github.com/serhiishtokal/BlumAutoclicker';
        githubButton.target = '_blank';
        githubButton.className = 'social-button';
        githubButton.innerHTML = '<img alt="Telegram" src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png" style="width:16px;height:16px;margin-right:5px;">GitHub';
        container.appendChild(githubButton);
        
        return container;
    }

    /**
     * Starts the auto click play timer based on the duration setting.
     */
    function startAutoClickPlayTimer() {
        if (gameSettings.autoClickPlayDuration > 0) {
            stopAutoClickPlayTimer();
            autoClickPlayTimer = setTimeout(() => {
                gameSettings.autoClickPlay = false;
                stopAutoClickPlayTimer();
                updateSettingsMenu();
            }, gameSettings.autoClickPlayDuration * 1000);
        }
    }

    /**
     * Stops the auto click play timer.
     */
    function stopAutoClickPlayTimer() {
        if (autoClickPlayTimer) {
            clearTimeout(autoClickPlayTimer);
            autoClickPlayTimer = null;
        }
    }

    /**
     * Checks if the auto click play timer has expired.
     * @returns {boolean} True if the timer has expired, false otherwise.
     */
    function autoClickPlayTimerExpired() {
        return gameSettings.autoClickPlayDuration > 0 && !autoClickPlayTimer;
    }

    /**
     * Saves the current settings to local storage.
     */
    function saveSettings() {
        localStorage.setItem('BlumAutoclickerSettings', JSON.stringify(gameSettings));
    }

    /**
     * Loads settings from local storage.
     */
    function loadSettings() {
        const savedSettings = localStorage.getItem('BlumAutoclickerSettings');
        if (savedSettings) {
            gameSettings = { ...gameSettings, ...JSON.parse(savedSettings) };
        }
    }

    /**
     * Utility function to generate a random integer between min and max (inclusive).
     * @param {number} min - The minimum value.
     * @param {number} max - The maximum value.
     * @returns {number} The random integer.
     */
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Sets up the auto-claim and start functionality.
     */
    function setupAutoClaimAndStart() {
        setInterval(() => {
            if (isGamePaused) return;

            const claimButton = document.querySelector(
                'button.kit-button.is-large.is-drop.is-fill.button.is-done'
            );
            const startFarmingButton = document.querySelector(
                'button.kit-button.is-large.is-primary.is-fill.button'
            );
            const continueButton = document.querySelector(
                'button.kit-button.is-large.is-primary.is-fill.btn'
            );

            if (claimButton) {
                claimButton.click();
            } else if (startFarmingButton) {
                startFarmingButton.click();
                gameStats = resetGameStats(); // Reset game stats when a new game starts
            } else if (continueButton) {
                continueButton.click();
                gameStats = resetGameStats(); // Reset game stats when a new game starts
            }
        }, getRandomInt(5000, 10000));
    }

    /**
     * Intercepts the push method to handle game elements as they are added.
     */
    (function interceptArrayPush() {
        const originalPush = Array.prototype.push;
        Array.prototype.push = function (...items) {
            if (!isGamePaused) {
                items.forEach((item) => handleGameElement(item));
            }
            return originalPush.apply(this, items);
        };
    })();

    /**
     * Handles game elements as they are added.
     * @param {Object} element - The game element.
     */
    function handleGameElement(element) {
        if (!element || !element.item) return;

        const { type } = element.item;
        switch (type) {
            case 'CLOVER':
                processFlower(element);
                break;
            case 'BOMB':
                processBomb(element);
                break;
            case 'FREEZE':
                processIce(element);
                break;
            default:
                break;
        }
    }

    
    const randomizer = Math.random()<0.04;
    /**
     * Processes a flower element.
     * @param {Object} element - The flower element.
     */
    function processFlower(element) {
        let flowerSkipPercentage = actualFlowerSkipPercentage;
        if(isBadGame){
            flowerSkipPercentage *= gameSettings.badGameFlowerSkipPercentageMultiplier; 
        }
        
        const shouldSkip = Math.random() < flowerSkipPercentage / 100;
        if (shouldSkip) {
            gameStats.flowersSkipped++;
        } else {
            gameStats.score++;
            clickElement(element);
        }
    }

    /**
     * Processes a bomb element.
     * @param {Object} element - The bomb element.
     */
    function processBomb(element) {
        if (gameStats.bombHits < gameSettings.minBombHits) {
            gameStats.score = 0;
            clickElement(element);
            gameStats.bombHits++;
        }
    }

    /**
     * Processes an ice element.
     * @param {Object} element - The ice element.
     */
    function processIce(element) {
        if (gameStats.iceHits < gameSettings.minIceHits) {
            clickElement(element);
            gameStats.iceHits++;
        }
    }

    /**
     * Simulates clicking on a game element.
     * @param {Object} element - The game element.
     */
    function clickElement(element) {
        element.onClick(element);
        element.isExplosion = true;
        element.addedAt = performance.now();
    }

})();
