<template>
  <div class="download-indicator">
    <div class="download-status circle top"></div>
    <div class="download-status circle bottom"></div>
  </div>
</template>

<script lang="ts">
import Grid from './grid/Grid.vue';
import { IGridHeader } from './grid/Grid.vue';
import GridRow from './grid/GridRow.vue';
import { Component, Prop, Vue } from 'vue-property-decorator';
import { orderBy } from 'lodash';

type IDownloadStatus = 'completed' | 'incomplete' | 'not-downloaded' | 'in-progress';

@Component({
  components: {
    Grid,
    GridRow,
  },
})
export default class TvGrid extends Vue {
  @Prop() private status!: IDownloadStatus;
  @Prop() private downloadable!: boolean;
}
</script>

<style scoped lang="scss">
  $circle-size: 20px;
  .download-indicator {
    .download-status {
      &.circle {
        width: $circle-size;
        height: $circle-size / 2;
        border: 2px solid $light-gray-1;

        &.top {
          border-top-left-radius: $circle-size * 2;
          border-top-right-radius: $circle-size * 2;
          border-bottom: none;
        }

        &.bottom {
          border-bottom-left-radius: $circle-size * 2;
          border-bottom-right-radius: $circle-size * 2;
          border-top: none;
        }

        &.filled {
          border-color: $green;
          background-color: $green-lighten-1;
        }

      }
    }
  }
</style>
