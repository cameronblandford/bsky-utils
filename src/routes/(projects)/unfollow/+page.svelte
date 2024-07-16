<script lang="ts">
  import { agent, getSavedSessionData, shuffle, timeAgo } from "$lib/api";
  import type { ProfileView } from "@atproto/api/dist/client/types/app/bsky/actor/defs";
  import type { FeedViewPost } from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import { fade } from "svelte/transition";

  let isAuthenticated = $state(false);
  let followingList: ProfileView[] = $state([]);
  let currentIndex = $state(0);
  let shownPosts: FeedViewPost[] = $state([]);
  let username = $state("");
  let password = $state("");
  let recentMessage = $state("");
  let totalFollowing = $state(0);
  let totalProcessed = $state(0);
  let whitelist = $state<string[]>([]);
  let showMuteButton = $state(false);
  let includeReplies = $state(true);
  let includeReposts = $state(true);
  let showBio = $state(false);
  let isLoading = $state(false);
  let isMutual = $state(false);
  let showIsMutual = $state(false);
  let bio = $state("");
  let sortMethod = $state<"random" | "chronological" | "reverse-chronological">(
    "chronological"
  );
  let timeout = $state<any>(null);
  let lastActions = $state<{ type: "unfollow" | "keep"; did: string }[]>([]);

  const undo = async () => {
    const lastAction = lastActions.pop();
    if (lastAction) {
      const { uri } = await agent.follow(lastAction.did);
      currentIndex--;
      totalProcessed--;
      notify(lastAction.type === "unfollow" ? "Re-followed" : "Went back");
    }
  };

  const notify = (message: string) => {
    recentMessage = message;
    // cancel existing timeouts
    timeout && clearTimeout(timeout);
    timeout = setTimeout(() => {
      recentMessage = "";
    }, 2000);
  };

  const resumeSession = async () => {
    const savedSessionData = getSavedSessionData();
    if (savedSessionData) {
      console.log("Resuming session");
      await agent.resumeSession(savedSessionData);
      console.log("LOGGED IN");
      console.log(agent.session);
      isAuthenticated = true;
      await fetchFollowing();
    }
  };
  $effect(() => {
    resumeSession();
  });

  const sortedFollowingList: ProfileView[] = $derived.by(() => {
    if (sortMethod === "random") {
      return shuffle([...followingList]);
    } else if (sortMethod === "chronological") {
      const newArr = [...followingList];
      newArr.reverse();
      return newArr;
    } else if (sortMethod === "reverse-chronological") {
      return [...followingList];
    } else {
      return [...followingList];
    }
  });

  async function authenticateWithBluesky() {
    // This is a placeholder. You'll need to implement actual Bluesky authentication
    // It might involve redirecting to Bluesky's auth page and handling a callback
    await agent.login({
      identifier: username,
      password,
    });
    isAuthenticated = true;
    await fetchFollowing();
  }

  async function fetchFollowing() {
    // Placeholder: Fetch the user's following list from Bluesky API
    // You'll need to replace this with actual API calls
    if (!agent.session?.handle) {
      alert("Please sign in first");
      return;
    }
    isLoading = true;
    let cursor = undefined;
    const maxPages = 100;
    let newList: ProfileView[] = [];
    for (let i = 0; i < maxPages; i++) {
      const response = await agent.getFollows({
        actor: agent.session.handle,
        limit: 50,
        cursor,
      });
      newList = [...newList, ...response.data.follows];
      console.log(response.data);
      if (response.data.cursor === undefined) break;
      cursor = response.data.cursor;
    }

    // check localstorage for whitelisted accounts
    const whitelistRaw = localStorage.getItem("whitelist");
    if (whitelistRaw) {
      whitelist = JSON.parse(whitelistRaw);
      newList = newList.filter((account) => !whitelist.includes(account.did));
    }
    totalFollowing = newList.length;
    followingList = newList;
    isLoading = false;
  }

  function keepFollowing() {
    // Implement logic to keep following the current account
    notify(`${currentAccount.handle} sparks joy!`);
    whitelist.push(currentAccount.did);
    lastActions.push({ type: "keep", did: currentAccount.did });
    currentIndex++;
    totalProcessed++;
    localStorage.setItem("whitelist", JSON.stringify(whitelist));
    document.getElementById("postWindow")?.scrollTo(0, 0);
  }

  async function unfollow() {
    // Implement logic to unfollow the current account
    // This would involve making an API call to Bluesky
    await unfollowUser();
    lastActions.push({ type: "unfollow", did: currentAccount.did });
    currentIndex++;
    totalProcessed++;
    document.getElementById("postWindow")?.scrollTo(0, 0);
  }

  async function unfollowUser() {
    // Placeholder: Make an API call to unfollow the user
    notify(`Unfollowed ${currentAccount.handle}`);
    const { uri } = await agent.follow(currentAccount.did);
    console.log(uri);
    await agent.deleteFollow(uri);
    // console.log(`Unfollowed user ${userId}`);
  }

  const currentAccount = $derived(sortedFollowingList[currentIndex] || null);
  const isFinished = $derived(currentIndex >= sortedFollowingList.length);
  // const isFinished = true;

  const updatePosts = async () => {
    const response = await agent.getAuthorFeed({
      actor: currentAccount.did,
      limit: 100,
    });
    const response2 = await agent.getProfile({
      actor: currentAccount.did,
    });
    console.log(response2);
    const { data: profile } = response2;
    isMutual = !!profile.viewer?.followedBy;
    bio = profile.description || "";
    console.log(response);
    shownPosts = response.data.feed;
    window.scrollTo(0, 0);
  };

  let isMuted = $derived(currentAccount?.viewer?.muted ?? false);
  let isMutedByList = $derived(currentAccount?.viewer?.mutedByList ?? false);

  const mute = async () => {
    await agent.mute(currentAccount.handle);
    notify(`Muted ${currentAccount.handle}`);
    if (currentAccount.viewer) {
      currentAccount.viewer.muted = true;
    }
  };
  const unmute = async () => {
    await agent.unmute(currentAccount.handle);
    notify(`Unmuted ${currentAccount.handle}`);
    if (currentAccount.viewer) {
      currentAccount.viewer.muted = false;
    }
  };
  $effect(() => {
    if (currentAccount) {
      updatePosts();
    }
  });
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      authenticateWithBluesky();
    }
  }
  const handleShortcuts = (event: KeyboardEvent) => {
    if (event.key === "j") {
      unfollow();
    }
    if (event.key === "k") {
      keepFollowing();
    }
    // if cmd z, undo
    if ((event.metaKey && event.key === "z") || event.key === "h") {
      undo();
    }
    if (event.key === "m") {
      if (currentAccount.viewer?.muted) {
        unmute();
      } else {
        mute();
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("session");
    location.reload();
  };
</script>

<svelte:window on:keydown={handleShortcuts} />
{#if isLoading}
  <div class="flex justify-center items-center h-screen w-screen font-mono">
    <div class="text-xl text-slate-500">Loading...</div>
  </div>
{:else}
  <main class="max-w-lg mx-auto mt-5 mb-20 px-2 font-mono">
    {#if recentMessage}
      <p
        class="rounded p-2 bg-slate-100 z-50 fixed top-0 left-0 text-xs"
        in:fade={{ duration: 100 }}
        out:fade={{ duration: 100 }}
      >
        {recentMessage}
      </p>
    {/if}
    {#if lastActions.length > 0}
      <button
        onclick={undo}
        class=" text-sm text-slate-500 text-center block absolute left-3 top-10"
        ><span class="underline">Undo</span><span class="hidden md:inline">
          (<span class="shortcut">H</span>)</span
        ></button
      >
    {/if}
    {#if !isAuthenticated}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col gap-2 max-w-sm mx-auto"
        onkeydown={handleKeydown}
      >
        <div class="mb-6">
          <h1 class="text-3xl font-semibold text-center mb-2">
            Gentle Unfollow
          </h1>
          <p class="text-center">
            Clean up your bluesky feed until it sparks joy!
          </p>
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
        <p class="text-sm text-slate-500 text-center mt-5">
          All requests are made directly to the Bluesky API, with no database or
          tracking. This project is an unabashed ripoff of <a
            class="underline"
            href="https://tokimeki-unfollow.glitch.me/"
            >Tokimeki Unfollow for Twitter</a
          >, which broke during Twitter's API lockdown. You are encouraged to
          use an
          <a class="underline" href="https://bsky.app/settings/app-passwords"
            >app password</a
          >
          and not your standard one. Yours,
          <a
            href="https://bsky.app/profile/cam.fyi"
            target="_blank"
            class="underline">Cam</a
          >
        </p>
      </div>
    {:else if isFinished}
      <div
        class="flex flex-col items-center justify-center min-h-screen min-w-screen gap-4 text-center"
      >
        <div>
          You've gone through your whole following list! Congratulations! Have a
          lovely rest of day :)
        </div>
        <div class="text-sm">
          <button
            class="underline text-slate-500 text-center mx-auto"
            onclick={() => {
              whitelist = [];
              localStorage.removeItem("whitelist");
              location.reload();
            }}>Reset Progress</button
          >
          or
          <button
            class="underline text-sm text-slate-500 text-center"
            onclick={logout}>Logout</button
          >
        </div>
      </div>
    {:else}
      <h2 class="text-center mb-4">Does this account spark joy?</h2>
      <div class="flex md:flex-col mb-4 px-4 gap-2 justify-center">
        <img
          src={currentAccount.avatar}
          alt={currentAccount.displayName}
          class="w-16 h-16 md:mx-auto rounded-full"
        />
        <div class="text-left md:text-center overflow-hidden">
          <p class="text-xl">{currentAccount.displayName}</p>
          <p class="font-bold">{currentAccount.handle}</p>
        </div>
      </div>
      {#if showBio}
        <p class="text-sm text-center mb-2">{bio}</p>
      {/if}
      {#if shownPosts.length > 0}
        <div class="flex justify-between">
          <a
            class="underline text-sm text-slate-500"
            href={`https://bsky.app/profile/${currentAccount.handle}`}
            target="_blank">Link</a
          >
          <p class="text-sm text-slate-500">
            Posted {timeAgo(shownPosts[0].post.indexedAt)}
          </p>
          {#if isMutual && showIsMutual}
            <p class="text-sm text-blue-500">Mutuals</p>
          {/if}
          {#if isMuted || isMutedByList}
            <p class="text-sm text-red-300">
              {isMuted ? "Muted" : "Muted by a list"}
            </p>
          {/if}
        </div>
      {/if}
      <!-- post window -->
      <div
        class=" md:max-h-[400px] overflow-y-auto overflow-x-hidden border rounded"
        id="postWindow"
      >
        {#each shownPosts
          .filter((p) => includeReplies || !p.reply)
          .filter((p) => includeReposts || !p.reason?.$type
                .toLowerCase()
                .includes("repost"))
          .slice(0, 10) as post}
          <p class="mb-4 pb-4 px-2 border-b first:pt-4">
            {#if post.reply}
              <span class="text-sm text-slate-500"
                >{`(to @${post.reply.parent?.author?.handle}) `}<br /></span
              >
            {/if}
            {#if post.reason?.$type.toLowerCase().includes("repost")}
              <span class="text-sm text-slate-500"
                >{`(reposted @${post.post.author?.handle}) `}<br /></span
              >
            {/if}
            {post.post.record.text}
            {#if post.post.embed?.media?.images?.length > 0}
              {#each post.post.embed.media.images as image}
                <img
                  src={image.thumb}
                  alt={image.alt}
                  class="w-auto max-w-full p-4 max-h-[400px] h-auto block mb-2 mx-auto"
                />
              {/each}
            {/if}
            {#if post.post.embed?.images?.length > 0}
              {#each post.post.embed.images as image}
                <img
                  src={image.thumb}
                  alt={image.alt}
                  class="w-auto max-w-full p-4 max-h-[400px] h-auto block mb-2 mx-auto"
                />
              {/each}
            {/if}
          </p>
        {/each}
      </div>
      <div class="hidden md:flex gap-4 mt-4">
        {#if showMuteButton}
          <button
            class="flex-1 btn rounded-none"
            onclick={currentAccount.viewer?.muted ? unmute : mute}
          >
            {currentAccount.viewer?.muted ? "Unmute" : "Mute"}
            <span class="hidden md:inline"
              >(<span class="shortcut">M</span>)</span
            ></button
          >
        {/if}
        <button class="flex-1 btn" onclick={unfollow}
          >Unfollow <span class="hidden md:inline"
            >(<span class="shortcut">J</span>)</span
          ></button
        >
        <button class="flex-1 btn" onclick={keepFollowing}
          >Keep<span class="hidden md:inline"
            >(<span class="shortcut">K</span>)</span
          ></button
        >
      </div>
      <div class="flex justify-between">
        <div class="text-center text-sm text-slate-500">
          Accts left: {sortedFollowingList.length - totalProcessed}
        </div>
        <button
          class="underline text-sm text-slate-500 text-center block"
          onclick={() => {
            whitelist = [];
            localStorage.removeItem("whitelist");
            location.reload();
          }}>Reset Progress</button
        >
        <button
          class="underline text-sm text-slate-500 text-center block"
          onclick={logout}>Logout</button
        >
      </div>
      <div class="mt-2">
        <!-- three radio buttons for the three sorts -->
        <label class="flex items-center gap-2">
          <input type="radio" bind:group={sortMethod} value="random" />
          <span class="text-sm text-slate-500">Random</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="radio" bind:group={sortMethod} value="chronological" />
          <span class="text-sm text-slate-500">Chronological</span>
        </label>
        <label class="flex items-center gap-2">
          <input
            type="radio"
            bind:group={sortMethod}
            value="reverse-chronological"
          />
          <span class="text-sm text-slate-500">Reverse Chronological</span>
        </label>
      </div>
      <div class="mt-2">
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={showBio} />
          <span class="text-sm text-slate-500">Show bio</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={includeReplies} />
          <span class="text-sm text-slate-500">Include replies</span>
        </label>
        <!-- checkbox for showing reposts -->
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={includeReposts} />
          <span class="text-sm text-slate-500">Include reposts</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={showMuteButton} />
          <span class="text-sm text-slate-500">Show "mute" button</span>
        </label>
        <label class="flex items-center gap-2">
          <input type="checkbox" bind:checked={showIsMutual} />
          <span class="text-sm text-slate-500">Show mutuality</span>
        </label>
      </div>
      <div class="fixed bottom-0 left-0 right-0 bg-white">
        <div class="flex md:hidden gap-0.5 p-0.5">
          <!-- <button
            class="flex-1 btn text-xl max-w-8"
            onclick={() => window.scrollTo(0, document.body.scrollHeight)}
            >⚙️</button
          > -->
          {#if showMuteButton}
            <button
              class="flex-1 btn rounded-none"
              onclick={currentAccount.viewer?.muted ? unmute : mute}
            >
              {currentAccount.viewer?.muted ? "Unmute" : "Mute"}
              <span class="hidden md:inline"
                >(<span class="shortcut">M</span>)</span
              ></button
            >
          {/if}
          <button class="flex-1 btn" onclick={unfollow}
            >Unfollow <span class="hidden md:inline"
              >(<span class="shortcut">J</span>)</span
            ></button
          >
          <button class="flex-1 btn" onclick={keepFollowing}
            >Keep<span class="hidden md:inline"
              >(<span class="shortcut">K</span>)</span
            ></button
          >
        </div>
      </div>
    {/if}
  </main>
{/if}

<style lang="postcss">
  .btn {
    @apply border border-black rounded hover:bg-black active:bg-black hover:text-white active:text-white py-5 md:py-2;
  }
  .shortcut,
  .btn:hover .shortcut {
    @apply bg-gray-200 px-1 text-black;
  }
  .underlined-links a {
    @apply underline;
  }
</style>
