<template>
  <!-- <div class="tv-grid">
    <div class="header row">
      <div class="label flex-40">Name</div>
      <div class="label flex-30">Size</div>
      <div class="label flex-30">Download</div>
    </div>
    <div v-if="!this.loading">
      <div class="row" v-for="movie in movies" v-bind:key="movie.name">
        <div class="flex-40">{{movie.name}}</div>
        <div class="flex-30">{{movie.size | numFormat('0.0b') }}</div>
        <div class="flex-30"></div>
      </div>
    </div>
    <div v-if="loading" class="row bold">Loading...</div>
  </div> -->
  <div class="movies-grid">
    <div v-if="loading">Loading...</div>
    <grid v-else :headers="gridHeaders">
      <grid-row v-for="movie in sortedMovies" v-bind:key="movie.name" :selectable="true" @row-clicked="onDownloadRequested(movie.id)">
        <td :style="{flex: 40}">{{movie.name}}</td>
        <td :style="{flex: 30}">{{movie.size | numFormat('0.0b') }}</td>
        <td :style="{flex: 30}">
          <download-indicator :status="'not-downloaded'" :downloadable="true"></download-indicator>
        </td>
      </grid-row>
    </grid>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import Grid from '@/components/grid/Grid.vue';
import { IGridHeader } from '../grid/Grid.vue'; // Have to use relative path for types to work...
import GridRow from '@/components/grid/GridRow.vue';
import DownloadIndicator from '@/components/DownloadIndicator.vue';
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
  },
})
export default class MoviesGrid extends Vue {
  @Prop() private movies!: any[];
  @Prop() private loading!: boolean;

  private sortCol: ISortCol = { value: 'name', direction: 'asc' };
  private gridHeaders: IGridHeader[] = [
    { label: 'Name', sortable: true, size: 40 },
    { label: 'Size', sortable: true, size: 30 },
    { label: 'Download Status', sortable: true, size: 30 },
  ];

  private get sortedMovies() {
    return orderBy(this.movies, this.sortCol.value, this.sortCol.direction);
  }

  private onDownloadRequested(id: string) {
    // TODO: Trigger dialog with movie details and download confirm
  }
}
</script>

<style scoped lang="scss">
  .movies-grid {
    width: 100%;
  }
</style>
