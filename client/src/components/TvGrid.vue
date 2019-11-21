<template>
  <div class="tv-grid">
    <div v-if="loading">Loading...</div>
    <grid v-else :headers="gridHeaders" :allow-expand="true">
      <grid-row v-for="show in sortedShows" v-bind:key="show.name" :selectable="true">
        <td :style="{flex: 40}">{{show.name}}</td>
        <td :style="{flex: 20}">{{show.children.length}}</td>
        <td :style="{flex: 20}">{{show.size | numFormat('0.0b') }}</td>
        <td :style="{flex: 20}">
          <download-indicator :status="'not-downloaded'" :downloadable="false"></download-indicator>
        </td>
        <template v-slot:expanded>
          <tv-season-chip v-for="(season, index) in show.children" :key="season.name" :season="season" :size="colSizes[index]" @season-download-requested="onSeasonDownloadRequested"></tv-season-chip>
        </template>
      </grid-row>
    </grid>
  </div>
</template>

<script lang="ts">
import Grid from './grid/Grid.vue';
import { IGridHeader } from './grid/Grid.vue';
import GridRow from './grid/GridRow.vue';
import DownloadIndicator from './DownloadIndicator.vue';
import TvSeasonChip from './TvSeasonChip.vue';
import { Component, Prop, Vue } from 'vue-property-decorator';
import { orderBy } from 'lodash';

interface ISortCol {
  value: string;
  direction: 'desc' | 'asc';
}

@Component({
  components: {
    Grid,
    GridRow,
    DownloadIndicator,
    TvSeasonChip,
  },
})
export default class TvGrid extends Vue {
  @Prop() private tvShows!: any[];
  @Prop() private loading!: boolean;

  private sortCol: ISortCol = { value: 'name', direction: 'asc' };
  private gridHeaders: IGridHeader[] = [
    { label: 'Name', sortable: true, size: 40 },
    { label: 'Seasons', sortable: true, size: 20 },
    { label: 'Size', sortable: true, size: 20 },
    { label: 'Download Status', sortable: true, size: 20 },
  ];

  private get sortedShows() {
    return orderBy(this.tvShows, this.sortCol.value, this.sortCol.direction);
  }

  private get colSizes() {
    return this.gridHeaders.map((h: IGridHeader) => h.size);
  }

  private onSeasonDownloadRequested(seasonId: string) {
    // TODO: Open dialog for season and confirm download selection
  }
}
</script>

<style scoped lang="scss">
  .tv-grid {
    width: 100%;
  }
</style>
