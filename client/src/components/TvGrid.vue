<template>
  <grid class="tv-grid" :headers="gridHeaders" :selectable="true" :allow-expand="true">
    <grid-row v-for="show in sortedShows" v-bind:key="show.name">
      <td :style="{flex: 40}">{{show.name}}</td>
      <td :style="{flex: 20}">{{show.children.length}}</td>
      <td :style="{flex: 20}">{{show.size | numFormat('0.0b') }}</td>
      <td :style="{flex: 20}">
        <download-indicator :status="'completed'" :downloadable="true"></download-indicator>
      </td>
      <template v-slot:expanded>
        <div>I'm expanded!!</div>
      </template>
    </grid-row>
  </grid>
</template>

<script lang="ts">
import Grid from './grid/Grid.vue';
import { IGridHeader } from './grid/Grid.vue';
import GridRow from './grid/GridRow.vue';
import DownloadIndicator from './DownloadIndicator.vue';
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
}
</script>

<style scoped lang="scss">
</style>
