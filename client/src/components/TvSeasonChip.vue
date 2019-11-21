<template>
  <div class="tv-season-chip">
    <download-indicator
      @download-requested="$emit('season-download-requested', season.id)"
      :status="'not-downloaded'"
      :downloadable="true"
    ></download-indicator>
    <span>{{season.name}}</span>
    <span class="dash">—</span>
    <span>{{season.children.length}} episodes</span>
    <span class="dash">—</span>
    <span>{{season.size | numFormat('0.0b') }}</span>
  </div>
</template>

<script lang="ts">
import DownloadIndicator from './DownloadIndicator.vue';
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({
  components: {
    DownloadIndicator,
  },
})
export default class TvSeasonChip extends Vue {
  @Prop() private season!: any[];
  @Prop() private size!: number;
}
</script>

<style scoped lang="scss">
  .tv-season-chip {
    display: flex;
    align-items: center;
    height: 45px;

    &:hover {
      font-weight: bold;
    }

    .download-indicator {
      margin-right: 15px;
    }

    .dash {
      margin: 0 20px;
    }
  }
</style>
