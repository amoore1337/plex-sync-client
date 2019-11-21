<template>
  <div class="home-container">
    <v-sheet class="side-menu" elevation="5">
      <h1>Plex Cache Manager</h1>
    </v-sheet>
    <div class="grid-container">
      <div class="grid-controls">
        <content-toggle></content-toggle>
      </div>
      <tv-grid v-bind:tvShows="content.tv" v-bind:loading="loadingContent"  v-if="contentType === 'tv'"></tv-grid>
      <movies-grid v-bind:movies="content.movies" v-bind:loading="loadingContent"  v-else></movies-grid>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import ContentToggle from '@/components/ContentToggle.vue';
import TvGrid from '@/components/tv/TvGrid.vue';
import MoviesGrid from '@/components/movies/MoviesGrid.vue';
import axios from 'axios';

@Component({
  components: {
    ContentToggle,
    TvGrid,
    MoviesGrid,
  },
})
export default class Home extends Vue {
  private contentType = '';
  private content: { [key: string]: any[] } = { tv: [], movies: [] };
  private loadingContent = true;

  private mounted() {
    this.updateGridDisplay();
  }

  @Watch('$route.query.type')
  private updateGridDisplay() {
    this.contentType = this.$route.query.type as string;
    this.loadContent();
  }

  private loadContent() {
    const routeMap: {[key: string]: string} = { tv: 'shows', movies: 'movies' };
    if (!this.content[this.contentType].length) {
      this.loadingContent = true;
      return axios.get(`/api/${routeMap[this.contentType]}`).then((res: any) => {
        this.content[this.contentType] = res.data;
        this.loadingContent = false;
      }).catch(() => this.loadingContent = false);
    }
  }

}
</script>
<style scoped lang="scss">
.home-container {
  display: flex;
  flex-direction: column;

  h1 {
    font-size: 1.3rem;
  }

  .side-menu {
    display: flex;
    height: 80px;
    width: 100%;
    padding: 0 20px;
    align-items: center;
    z-index: 10;
  }
}

.grid-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: calc(100vh - 85px);
  overflow: auto;
  align-items: flex-start;
  padding: 0 20px 20px 20px;
  background-color: white;

  .grid-controls {
    width: 100%;
  }
}
</style>
