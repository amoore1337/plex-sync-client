<template>
  <div :class="['download-indicator', status, { 'downloadable': downloadable }]">
    <div v-if="!showDownloadButton && status !== 'in-progress'" class="circle">
      <div class="half top"></div>
      <div class="half bottom"></div>
    </div>
    <v-btn v-else @click="$emit('download-requested')" color="light-blue darken-1" dark small>
      <v-icon dark medium>mdi-download</v-icon>
    </v-btn>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { orderBy } from 'lodash';

type IDownloadStatus = 'completed' | 'incomplete' | 'not-downloaded' | 'in-progress';

@Component
export default class TvGrid extends Vue {
  @Prop() private status!: IDownloadStatus;
  @Prop() private downloadable!: boolean;

  private get showDownloadButton() {
    return this.status === 'not-downloaded' && this.downloadable;
  }
}
</script>

<style scoped lang="scss">
  $circle-size: 20px;
  .download-indicator {
    .circle {
      .half {
        width: $circle-size;
        height: $circle-size / 2;
        border: 2px solid $light-gray-1;
      }

      .top {
        border-top-left-radius: $circle-size * 2;
        border-top-right-radius: $circle-size * 2;
        border-bottom: none;
      }

      .bottom {
        border-bottom-left-radius: $circle-size * 2;
        border-bottom-right-radius: $circle-size * 2;
        border-top: none;
      }
    }

    &.completed {
      .circle .top {
        border-color: $green;
        background-color: $green-lighten-1;
      }
      .circle .bottom {
        border-color: $green;
        background-color: $green-lighten-1;
      }
    }

    &.incomplete {
      .circle .bottom {
        border-color: $green;
        background-color: $green-lighten-1;
      }
    }
  }
</style>
