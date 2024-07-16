<script lang="ts">
  import { agent, getSavedSessionData } from "$lib/api";

  let isAuthenticated = $state(false);
  let username = $state("");
  let password = $state("");
  let notificationText = $state("");
  let isLoading = $state(false);
  let timeout = $state<any>(null);
  let linkToNewList = $state("");

  const resumeSession = async () => {
    const savedSessionData = getSavedSessionData();
    if (savedSessionData) {
      console.log("Resuming session");
      await agent.resumeSession(savedSessionData);
      console.log("LOGGED IN");
      console.log(agent.session);
      isAuthenticated = true;
      //   await fetchFollowing();
    }
  };
  $effect(() => {
    resumeSession();
  });

  const notify = (message: string) => {
    notificationText = message;
    // cancel existing timeouts
    timeout && clearTimeout(timeout);
    timeout = setTimeout(() => {
      notificationText = "";
    }, 8000);
  };

  async function authenticateWithBluesky() {
    // This is a placeholder. You'll need to implement actual Bluesky authentication
    // It might involve redirecting to Bluesky's auth page and handling a callback
    console.log("Logging in with Bluesky");
    await agent.login({
      identifier: username,
      password,
    });
    isAuthenticated = true;
    console.log("Logged in with Bluesky");
  }

  const logout = () => {
    localStorage.removeItem("session");
    location.reload();
  };
  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === "Enter") {
      authenticateWithBluesky();
    }
  };

  let listName = $state("");
  let listDescription = $state("");
  let existingListUrl = $state("");
  let listType = $state<"curatelist" | "modlist">("curatelist");
  const createList = async () => {
    const sourceListUrl = existingListUrl;

    if (!agent.session?.did) {
      alert("Please sign in first");
      return;
    }
    const {
      data: { uri: destUri },
    } = await agent.com.atproto.repo.createRecord({
      repo: agent.session.did,
      collection: "app.bsky.graph.list",
      record: {
        $type: "app.bsky.graph.list",
        purpose: `app.bsky.graph.defs#${listType}`,
        name: listName,
        description: listDescription + `\n\nCopied from ${sourceListUrl}`,
        createdAt: new Date().toISOString(),
      },
    });
    const dest_rkey = destUri.split("/").pop();
    const [_1, src_handle, src_rkey] =
      sourceListUrl.match(
        /https:\/\/bsky.app\/profile\/(.*?)\/lists\/(.*?)(?:\/|$)/
      ) || [];
    if (!src_handle || !src_rkey) {
      return console.error("The source URL doesn't match the expected format.");
    }

    const src_did = !src_handle.startsWith("did:")
      ? (
          await (
            await fetch(
              `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${src_handle}`
            )
          ).json()
        ).did
      : src_handle;

    let totalRetrieved = 0;
    let currentCursor = "";
    let members: any[] = [];

    do {
      const list = await (
        await fetch(
          `https://bsky.social/xrpc/app.bsky.graph.getList?list=at://${src_did}/app.bsky.graph.list/${src_rkey}&limit=100&cursor=${currentCursor}`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${agent.session.accessJwt}`,
            },
          }
        )
      ).json();
      currentCursor = list.cursor;
      totalRetrieved = list.items.length;
      members = [...members, ...list.items];
    } while (currentCursor !== undefined && currentCursor !== "");
    for (let i = 0; i < members.length; i += 3) {
      await Promise.all(
        members.slice(i, i + 3).map((member) =>
          fetch("https://bsky.social/xrpc/com.atproto.repo.createRecord", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${agent.session?.accessJwt}`,
            },
            body: JSON.stringify({
              collection: "app.bsky.graph.listitem",
              repo: agent.session?.did,
              record: {
                subject: member.subject.did,
                list: `at://${agent.session?.did}/app.bsky.graph.list/${dest_rkey}`,
                createdAt: new Date().toISOString(),
              },
            }),
          })
        )
      );
    }
    notify("List successfully copied!");
    linkToNewList = `https://bsky.app/profile/${agent.session.handle}/lists/${dest_rkey}`;
  };
</script>

<!-- <svelte:window on:keydown={handleShortcuts} /> -->
{#if isLoading}
  <div class="flex justify-center items-center h-screen w-screen font-mono">
    <div class="text-xl text-slate-500">Loading...</div>
  </div>
{:else}
  <main class="max-w-lg mx-auto mt-5 mb-20 px-2 font-mono">
    {#if !isAuthenticated}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col gap-2 max-w-sm mx-auto"
        onkeydown={handleKeydown}
      >
        <div class="mb-6">
          <h1 class="text-3xl font-semibold text-center mb-2">List Copier</h1>
          <p class="text-center">Make a new list from an existing one!</p>
        </div>
        <input
          class="border px-2 py-1"
          bind:value={username}
          placeholder="Username"
        />
        <input
          class="border px-2 py-1"
          bind:value={password}
          placeholder="Password"
          type="password"
        />
        <button
          class="rounded bg-blue-300 px-2 py-1"
          onclick={authenticateWithBluesky}>Sign in with Bluesky</button
        >
        <p class="text-sm text-slate-500 text-center mt-5 underlined-links">
          All requests are made directly to the Bluesky API, with no database or
          tracking. You are encouraged to use an
          <a href="https://bsky.app/settings/app-passwords">app password</a>
          and not your standard one.
          <a href="https://bsky.app/profile/did:plc:jfhpnnst6flqway4eaeqzj2a"
            >Bossett's</a
          >
          <a
            href="https://gist.github.com/Bossett/c012ed574d96114569af7ba3b25693f1#file-copylist-js"
            >list-copying script</a
          >
          made this an easy project. Yours,
          <a href="https://bsky.app/profile/cam.fyi" target="_blank">Cam</a>
        </p>
      </div>
    {:else}
      <h2 class="text-center mb-4">Clone any list!</h2>
      <!-- a form that lets you choose a name, description, and image for the list -->
      <form class="flex flex-col gap-2 mt-2">
        <label for="url" class="text-sm text-slate-500">Source URL</label>
        <input
          type="text"
          id="url"
          class="border px-2 py-1"
          bind:value={existingListUrl}
          placeholder="https://bsky.app/profile/haileyok.com/lists/3khqnfiwudl2z"
        />
        <label for="name" class="text-sm text-slate-500 mt-2">Name</label>
        <input
          type="text"
          id="name"
          class="border px-2 py-1"
          bind:value={listName}
          placeholder="Name"
        />
        <label for="description" class="text-sm text-slate-500 mt-2"
          >Description</label
        >
        <textarea
          id="description"
          class="border px-2 py-1"
          bind:value={listDescription}
          placeholder="Description"
        ></textarea>
        <!-- radio button to choose between moderation list or curation list -->
        <div class="text-sm text-slate-500 mt-2">Purpose of your new list</div>
        <div class="flex gap-2 flex-col">
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={listType} value="modlist" />
            <span class="text-sm text-slate-500">Moderation List</span>
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" bind:group={listType} value="curatelist" />
            <span class="text-sm text-slate-500">Curation List</span>
          </label>
          <button class="rounded bg-blue-300 px-2 py-1" onclick={createList}
            >Create List</button
          >
        </div>
      </form>
      {#if linkToNewList}
        <a
          href={linkToNewList}
          class="underline block mx-auto text-center text-sm text-slate-500 mt-5"
          >Permalink</a
        >
      {/if}
      {#if notificationText}
        <p class="text-sm text-slate-500 text-center mt-5">
          {notificationText}
        </p>
      {/if}
    {/if}
  </main>
{/if}

<style lang="postcss">
  .underlined-links a {
    @apply underline;
  }
</style>
