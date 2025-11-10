document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      // Force a fresh fetch to avoid cached responses so UI updates immediately
      const response = await fetch("/activities", { cache: "no-cache" });
      const activities = await response.json();

      // Clear loading message and previous content
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - (details.participants ? details.participants.length : 0);

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        // Participants section (build with DOM to avoid injection and keep styling flexible)
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";

        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = "Participants";
        participantsDiv.appendChild(participantsHeader);

        const ul = document.createElement("ul");
        ul.className = "participants-list";

        if (details.participants && details.participants.length) {
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            li.className = "participant-item";

            // Compute a display label and email value
            let displayText = "";
            let participantEmail = "";
            if (typeof p === "string") {
              displayText = p;
              participantEmail = p;
            } else if (p && typeof p === "object") {
              displayText = p.name || p.email || JSON.stringify(p);
              participantEmail = p.email || displayText;
            } else {
              displayText = String(p);
              participantEmail = displayText;
            }

            const span = document.createElement("span");
            span.textContent = displayText;
            span.className = "participant-label";

            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "delete-participant";
            delBtn.title = `Unregister ${participantEmail} from ${name}`;
            delBtn.dataset.email = participantEmail;
            delBtn.dataset.activity = name;
            delBtn.innerHTML = "✖";

            li.appendChild(span);
            li.appendChild(delBtn);
            ul.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "no-participants";
          li.textContent = "No participants yet";
          ul.appendChild(li);
        }

        participantsDiv.appendChild(ul);
        activityCard.appendChild(participantsDiv);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        // keep the 'message' base class so shared styling applies
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities so the participants panel updates immediately
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Event delegation for delete/unregister clicks
  activitiesList.addEventListener("click", async (event) => {
    const target = event.target;
    if (target.classList.contains("delete-participant")) {
      const email = target.dataset.email;
      const activity = target.dataset.activity;

      if (!email || !activity) return;

      const confirmed = confirm(`Unregister ${email} from ${activity}?`);
      if (!confirmed) return;

      try {
        const res = await fetch(
          `/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`,
          { method: "DELETE" }
        );

        const result = await res.json();
        if (res.ok) {
          messageDiv.textContent = result.message;
          messageDiv.className = "message success";
          messageDiv.classList.remove("hidden");
          // Refresh the activities list
          await fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "Failed to unregister";
          messageDiv.className = "message error";
          messageDiv.classList.remove("hidden");
        }

        setTimeout(() => messageDiv.classList.add("hidden"), 4000);
      } catch (err) {
        console.error("Error unregistering:", err);
        messageDiv.textContent = "Failed to unregister. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        setTimeout(() => messageDiv.classList.add("hidden"), 4000);
      }
    }
  });
});
