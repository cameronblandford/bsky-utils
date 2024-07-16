<script>
  const users = [
    {
      name: "cwonus",
      url: "https://bsky.app/profile/cwonus.org",
    },
    {
      name: "hai",
      url: "https://bsky.app/profile/haicat.moe",
    },
    {
      name: "juliet",
      url: "https://bsky.app/profile/futanari.tentacle.expert",
    },
    {
      name: "futur",
      url: "https://bsky.app/profile/futur.blue",
    },
    {
      name: "geca",
      url: "https://bsky.app/profile/geca.bsky.social",
    },
    {
      name: "bossett",
      url: "https://bsky.app/profile/did:plc:jfhpnnst6flqway4eaeqzj2a",
    },
  ];
</script>

<main
  class="max-w-lg mx-auto mt-5 mb-20 px-2 font-mono flex flex-col gap-4 justify-center"
>
  <div class="mb-6">
    <h1 class="text-3xl font-semibold text-center mb-2">bsky utils</h1>
    <p class="text-center">Handcrafted in USA</p>
  </div>
  <ul class="text-sm text-slate-500 flex flex-col justify-center items-center">
    <li>
      <a href="/unfollow">gentle unfollower</a>
    </li>
    <li><a href="/lists">list copier</a></li>
  </ul>
  <hr class="mt-5" />
  <div class="italic text-sm text-slate-500 text-center mt-5">
    <!-- <div class="text-black">Testimonials</div> -->
    <p>
      <!-- this is super cool, really<br /> -->
      "very good project, just perfect<br />
      now my following tab is usable again!"<br />
      <!-- thank you<br /> -->
      —
      <a
        href="https://bsky.app/profile/geca.bsky.social/post/3kwxsg4amha25"
        target="_blank"
        class="underline">@geca.bsky.social</a
      >
    </p>
  </div>
  <hr class="mt-5" />

  <div class="text-sm text-slate-500 text-center mt-5">
    <div class="text-black">Other beloved bsky apps:</div>
    <ul class="underlined-links">
      <li>
        <a href="https://bsky.jazco.dev/thread" target="_blank"
          >Tree view for bsky threads</a
        >
        by
        <a href="https://bsky.app/profile/jaz.bsky.social" target="_blank"
          >Jaz</a
        >
      </li>
      <li>
        <a href="https://cleanfollow-bsky.pages.dev/" target="_blank"
          >Hidden acct unfollower</a
        >
        by
        <a
          href="https://bsky.app/profile/futanari.tentacle.expert"
          target="_blank">juliet</a
        >
      </li>
      <li>
        <a href="https://wolfgang.raios.xyz/">Interaction statistics</a> by Wolfgang
      </li>
      <li>
        <a href="https://docs.bsky.app/showcase" target="_blank"
          >community showcase</a
        > by the bsky devs
      </li>
    </ul>
    <p class="mt-4 md:px-20">
      Many thanks to
      {#each users as user}
        <a href={user.url} target="_blank" class="underline">{user.name}</a
        >,{" "}
      {/each}
      and many more for their feedback and contributions
    </p>
  </div>
</main>

<style>
  a {
    @apply underline;
  }
</style>
