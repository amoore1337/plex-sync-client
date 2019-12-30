<template>
  <div class="tv-season-chip">
    <download-indicator
      @download-requested="$emit('season-download-requested', season.token)"
      :status="season.status"
      :progress="progress"
      :downloadable="true"
    ></download-indicator>
    <span>{{season.name}}</span>
    <span class="dash">—</span>
    <span>{{season.episodes.length}} episodes</span>
    <span class="dash">—</span>
    <span>{{season.size | numFormat('0.0b') }}</span>
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
export default class TvSeasonChip extends Vue {
  @Prop() private season!: any;
  @Prop() private progress!: any;
}
</script>

<style scoped lang="scss">
  .tv-season-chip {
    display: flex;
    align-items: center;
    height: 45px;

    .download-indicator {
      display: flex;
      justify-content: center;
      margin-right: 15px;
      width: 50px;
    }

    .dash {
      margin: 0 20px;
    }
  }
</style>
