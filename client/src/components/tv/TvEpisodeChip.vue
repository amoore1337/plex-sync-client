<template>
  <div class="tv-episode-chip">
    <download-indicator
      :status="episode.status"
      :downloadable="false"
      :progress="progress"
    ></download-indicator>
    <span>{{episode.name}}</span>
  </div>
</template>

<script lang="ts">
import DownloadIndicator from '@/components/DownloadIndicator.vue';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  components: {
    DownloadIndicator,
  },
})
export default class TvEpisodeChip extends Vue {
  @Prop() private episode!: any[];
  @Prop() private size!: number;
  @Prop() private progress!: number;
}
</script>

<style scoped lang="scss">
  .tv-episode-chip {
    display: flex;
    align-items: center;
    height: 45px;

    .download-indicator {
      display: flex;
      justify-content: center;
      width: 65px;
    }

    .dash {
      margin: 0 20px;
    }
  }
</style>
