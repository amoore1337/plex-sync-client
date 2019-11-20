<template>
  <div class="tv-grid">
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
    <!-- <div v-if="!loading && !tvShows.length" class="row bold">No data...</div> -->
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class MoviesGrid extends Vue {
  @Prop() private movies!: any[];
  @Prop() private loading!: boolean;
}
</script>

<style scoped lang="scss">
  .tv-grid {
    border: 1px solid $light-gray-1;
    border-radius: 8px;
    width: 100%;
    padding: 0;
    position: relative;

    .row {
      height: 60px;
      width: 100%;
      margin: 0;
      padding: 0 20px;
      display: flex;
      flex-direction: row;
      align-items: center;
      border-bottom: 1px solid $light-gray-2;

      &:last-child { border-bottom: none; }

      &.header { border-color: $light-gray-1; }

      // this is dumb but i'll figure out something better later
      .flex-60 { flex: 60; }
      .flex-40 { flex: 40; }
      .flex-30 { flex: 30; }
      .flex-20 { flex: 20; }
      .flex-10 { flex: 10; }
    }
  }
</style>
