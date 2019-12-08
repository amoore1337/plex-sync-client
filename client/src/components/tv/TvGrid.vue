<template>
  <div class="tv-grid">
    <div v-if="loading">Loading...</div>
    <grid v-else :headers="gridHeaders" :allow-expand="true">
      <grid-row v-for="show in sortedShows" v-bind:key="show.name" :selectable="true">
        <td :style="{flex: 40}">{{show.name}}</td>
        <td :style="{flex: 20}">{{show.children.length}}</td>
        <td :style="{flex: 20}">{{show.size | numFormat('0.0b') }}</td>
        <td :style="{flex: 20}">
          <download-indicator :status="show.status" :downloadable="false"></download-indicator>
        </td>
        <template v-slot:expanded>
          <tv-season-chip v-for="(season, index) in show.children" :key="season.name" :season="season" :size="colSizes[index]" @season-download-requested="onSeasonDownloadRequested(show, season)"></tv-season-chip>
        </template>
      </grid-row>
    </grid>
    <v-dialog v-model="showDownloadDialog" max-width="700">
      <v-card>
        <v-card-title>
          Download <i class="italic">{{selected.show.name}} — {{selected.season.name}}</i>?
        </v-card-title>
        <v-card-text>
          The selected movie will be downloaded directly to your server and will appear in Plex once completed.
          Please ensure you have approximately <strong>{{selected.season.size | numFormat('0.0b')}}</strong> of free space available on your server before continuing.
        </v-card-text>
        <v-card-actions>
          <remaining-space-indicator :space-required="this.selected.season.size"></remaining-space-indicator>
          <v-spacer></v-spacer>
          <v-btn text @click="showDownloadDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="initiateDownload(selected.season.id)">
            <v-icon dark medium>mdi-download</v-icon>
            Download Season
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import Grid from '@/components/grid/Grid.vue';
import { IGridHeader } from '../grid/Grid.vue'; // Have to use relative path for types to work...
import GridRow from '@/components/grid/GridRow.vue';
import DownloadIndicator from '@/components/DownloadIndicator.vue';
import RemainingSpaceIndicator from '@/components/RemainingSpaceIndicator.vue';
import TvSeasonChip from '@/components/tv/TvSeasonChip.vue';
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
    TvSeasonChip,
    DownloadIndicator,
    RemainingSpaceIndicator,
  },
})
export default class TvGrid extends Vue {
  @Prop() private tvShows!: any[];
  @Prop() private loading!: boolean;

  private showDownloadDialog = false;
  private selected = {
    show: {},
    season: {},
  };
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

  private onSeasonDownloadRequested(show: any, season: any) {
    this.selected = { show, season };
    this.showDownloadDialog = true;
  }

  private initiateDownload(seasonId: string) {
    this.showDownloadDialog = false;
    // TODO: Make request to backend to trigger download
  }
}
</script>

<style scoped lang="scss">
  .tv-grid {
    width: 100%;
  }
</style>
