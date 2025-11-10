// --- API Configuration ---
const COHORT = "2803-PUPPIES";
const BASE_URL = `https://fsa-puppy-bowl.herokuapp.com/api/${COHORT}/`;

//If you would like to, you can create a variable to store the API_URL here.
const API_ENDPOINTS = {
  PLAYERS: `${BASE_URL}players`,
  TEAMS: `${BASE_URL}teams`,
  PLAYER_ID: (id) => `${BASE_URL}players/${id}`,
};

/////////////////////////////
/*This looks like a good place to declare any state or global variables you might need*/
let allPlayers = [];
let teamsCache = []; // Store teams for detail lookup and form options
let selectedPlayerId = null;

// --- DOM Elements using querySelector ---
const rosterContainer = document.querySelector("#roster-container");
const playerDetails = document.querySelector("#player-details");
const addPlayerForm = document.querySelector("#add-player-form");
const teamSelect = document.querySelector("#teamId");
const formMessage = document.querySelector("#form-message");

////////////////////////////

/**
 * Fetches all teams from the API and updates the global cache and form options.
 */
const fetchAllTeams = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.TEAMS);
    const result = await response.json();
    if (result.success) {
      teamsCache = result.data.teams;
      // Populate team dropdown
      teamsCache.forEach((team) => {
        const option = document.createElement("option");
        option.value = team.id;
        option.textContent = team.name;
        teamSelect.appendChild(option);
      });
      return teamsCache;
    }
  } catch (error) {
    console.error("Error fetching teams:", error);
    return [];
  }
};

/**
 * Fetches all players from the API.
 * This function should not be doing any rendering
 * @returns {Object[]} the array of player objects
 */
const fetchAllPlayers = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.PLAYERS);
    const result = await response.json();
    if (result.success) {
      allPlayers = result.data.players; // Update global state
      return allPlayers;
    } else {
      console.error("API Error:", result.error.message);
      return [];
    }
  } catch (error) {
    console.error("Fetch roster error:", error);
    return [];
  }
};

/**
 * Fetches a single player from the API.
 * This function should not be doing any rendering
 * @param {number} playerId
 * @returns {Object} the player object
 */
const fetchSinglePlayer = async (playerId) => {
  try {
    const response = await fetch(API_ENDPOINTS.PLAYER_ID(playerId));
    const result = await response.json();
    if (result.success) {
      return result.data.player;
    } else {
      console.error("API Error:", result.error.message);
      return null;
    }
  } catch (error) {
    console.error(`Fetch single player ${playerId} error:`, error);
    return null;
  }
};

/**
 * Adds a new player to the roster via the API.
 * @param {Object} newPlayer the player to add
 */
const addNewPlayer = async (newPlayer) => {
  try {
    formMessage.textContent = "Adding puppy...";
    const response = await fetch(API_ENDPOINTS.PLAYERS, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newPlayer),
    });

    const result = await response.json();

    if (result.success) {
      formMessage.textContent = `Success! Added ${newPlayer.name} to the roster.`;
      addPlayerForm.reset();
      await fetchAllPlayers(); // Refresh data
      render(); // Re-render UI
    } else {
      formMessage.textContent = `Error adding puppy: ${result.error.message}`;
    }
  } catch (error) {
    formMessage.textContent = "Failed to connect to the API to add the puppy.";
    console.error("Add player error:", error);
  }
};

/**
 * Removes a player from the roster via the API.
 * @param {number} playerId the ID of the player to remove
 */
const removePlayer = async (playerId) => {
  try {
    const response = await fetch(API_ENDPOINTS.PLAYER_ID(playerId), {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      console.log(`Player ${playerId} removed successfully.`);
      selectedPlayerId = null; // Clear selection
      await fetchAllPlayers(); // Refresh data
      render(); // Re-render UI
    } else {
      alert(`Failed to remove player: ${result.error.message}`);
    }
  } catch (error) {
    console.error("Remove player error:", error);
    alert("An error occurred while trying to remove the player.");
  }
};

// --- UI Rendering Helpers ---

/**
 * Renders the player detail section based on the selectedPlayerId state.
 */
const renderPlayerDetails = async () => {
  if (!selectedPlayerId) {
    playerDetails.innerHTML =
      "<p>Please select a puppy from the roster to see their details.</p>";
    return;
  }

  // Fetch the player details again (or look up from allPlayers if you trust that cache)
  const player = await fetchSinglePlayer(selectedPlayerId);

  if (!player) {
    playerDetails.innerHTML =
      '<p style="color: red;">Error: Player details not found.</p>';
    return;
  }

  // Find the team name using the teamsCache
  const team = teamsCache.find((t) => t.id === player.teamId);
  const teamName = team ? team.name : "Unassigned";

  playerDetails.innerHTML = `
        <div class="player-detail-card">
            <img src="${
              player.imageUrl || "https://via.placeholder.com/200?text=No+Image"
            }" 
                 alt="${
                   player.name
                 } image" style="width: 200px; height: 200px; object-fit: cover; border-radius: 8px;">
            <h3>${player.name}</h3>
            <p><strong>ID:</strong> ${player.id}</p>
            <p><strong>Breed:</strong> ${player.breed}</p>
            <p><strong>Status:</strong> ${player.status}</p>
            <p><strong>Team:</strong> ${teamName}</p>
            <button id="remove-button">Remove from Roster</button>
        </div>
    `;

  // Attach event listener to the remove button
  document.querySelector("#remove-button").addEventListener("click", () => {
    if (confirm(`Are you sure you want to remove ${player.name}?`)) {
      removePlayer(player.id);
    }
  });
};

/**
 * Handles the selection of a player and triggers the detail view update.
 * @param {number} playerId - The ID of the clicked player.
 */
const handlePlayerSelection = (playerId) => {
  selectedPlayerId = playerId;

  // Update the 'selected' class on the roster cards
  document.querySelectorAll(".player-card").forEach((card) => {
    card.classList.remove("selected");
  });
  const selectedCard = document.querySelector(
    `.player-card[data-id="${playerId}"]`
  );
  if (selectedCard) {
    selectedCard.classList.add("selected");
  }

  renderPlayerDetails();
};

/**
 * Updates html to display a list of all players or a single player page.
 */
const render = () => {
  // 1. Render Roster
  rosterContainer.innerHTML = "";

  if (allPlayers.length === 0) {
    rosterContainer.innerHTML = "<p>No puppies currently on the roster!</p>";
  } else {
    allPlayers.forEach((player) => {
      const card = document.createElement("div");
      card.className = `player-card ${
        player.id === selectedPlayerId ? "selected" : ""
      }`;
      card.dataset.id = player.id;
      card.innerHTML = `
                <img src="${
                  player.imageUrl ||
                  "https://via.placeholder.com/100?text=No+Image"
                }" 
                     alt="${player.name} image">
                <strong>${player.name}</strong>
                <p>#${player.id}</p>
            `;

      // Attach event listener
      card.addEventListener("click", () => handlePlayerSelection(player.id));

      rosterContainer.appendChild(card);
    });
  }

  // 2. Render Player Details (based on current state)
  renderPlayerDetails();
};

// --- Form Handler ---

const handleAddPlayerFormSubmit = (e) => {
  e.preventDefault();

  const name = document.querySelector("#name").value;
  const breed = document.querySelector("#breed").value;
  let teamId = document.querySelector("#teamId").value;

  // Format teamId for API (number or null)
  teamId = teamId === "" ? null : parseInt(teamId);

  const newPlayerData = {
    name,
    breed,
    status: "bench",
    teamId,
    // Using a generic placeholder image for new additions
    imageUrl: "https://via.placeholder.com/100?text=New+Puppy",
  };

  addNewPlayer(newPlayerData);
};

// --- Initialization ---

/**
 * Initializes the app by calling render
 */
const init = async () => {
  //Before we render, what do we always need...?
  // 1. Fetch Teams (needed for the form and details)
  await fetchAllTeams();

  // 2. Fetch Players (needed for the roster)
  await fetchAllPlayers();

  // 3. Set up event listeners (Form submission)
  addPlayerForm.addEventListener("submit", handleAddPlayerFormSubmit);

  // 4. Render the initial state of the application
  render();
};

init();
