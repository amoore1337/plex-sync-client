<template>
  <div class="movies-grid">
    <div v-if="loading">Loading...</div>
    <grid v-else :headers="gridHeaders">
      <grid-row v-for="movie in sortedMovies" v-bind:key="movie.token" :selectable="true" @row-clicked="onDownloadRequested(movie)">
        <td :style="{flex: 40}">{{movie.name}}</td>
        <td :style="{flex: 30}">{{movie.size | numFormat('0.0b') }}</td>
        <td :style="{flex: 30}">
          <download-indicator :status="movie.status"></download-indicator>
        </td>
      </grid-row>
    </grid>

    <v-dialog v-model="showDownloadDialog" max-width="700">
      <v-card>
        <v-card-title>
          Download <i class="italic">{{selectedMovie.name}}</i>?
        </v-card-title>
        <v-card-text>
          The selected movie will be downloaded directly to your server and will appear in Plex once completed.
          Please ensure you have approximately <span class="font-weight-bold">{{selectedMovie.size | numFormat('0.0b')}}</span> of free space available on your server before continuing.
        </v-card-text>
        <v-card-actions>
          <remaining-space-indicator :space-required="this.selectedMovie.size"></remaining-space-indicator>
          <v-spacer></v-spacer>
          <v-btn text @click="showDownloadDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="initiateDownload(selectedMovie.token)">
            <v-icon dark medium>mdi-download</v-icon>
            Download Movie
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Grid from '@/components/grid/Grid.vue';
import { IGridHeader } from '../grid/Grid.vue'; // Have to use relative path for types to work...
import GridRow from '@/components/grid/GridRow.vue';
import DownloadIndicator from '@/components/DownloadIndicator.vue';
import RemainingSpaceIndicator from '@/components/RemainingSpaceIndicator.vue';
import { fileSystemService, IFileSystemStats } from '@/services/file-system.service';
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
    RemainingSpaceIndicator,
  },
})
export default class MoviesGrid extends Vue {
  @Prop() private movies!: any[];
  @Prop() private loading!: boolean;

  private showDownloadDialog = false;
  private selectedMovie: any = {};
  private sortCol: ISortCol = { value: 'name', direction: 'asc' };
  private gridHeaders: IGridHeader[] = [
    { label: 'Name', sortable: true, size: 40 },
    { label: 'Size', sortable: true, size: 30 },
    { label: 'Download Status', sortable: true, size: 30 },
  ];

  private get sortedMovies() {
    return orderBy(this.movies, this.sortCol.value, this.sortCol.direction);
  }

  private onDownloadRequested(movie: any) {
    this.selectedMovie = movie;
    this.showDownloadDialog = true;
  }

  private initiateDownload(id: string) {
    this.showDownloadDialog = false;
    // TODO: Make request to trigger download
  }
}
</script>

<style scoped lang="scss">
  .movies-grid {
    width: 100%;
  }
</style>
