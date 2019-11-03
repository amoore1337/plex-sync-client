<template>
  <div class="home-container">
    <v-sheet class="side-menu" elevation="5">
      <h1>Plex Cache Manager</h1>
    </v-sheet>
    <div class="grid-container">
      <div class="grid-controls">
        <content-toggle></content-toggle>
      </div>
      <tv-grid v-bind:tvShows="tvShows" v-bind:loading="loadingContent"  v-if="contentType === 'tv'"></tv-grid>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';
import ContentToggle from '@/components/ContentToggle.vue';
import TvGrid from '@/components/TvGrid.vue';
import axios from 'axios';

@Component({
  components: {
    ContentToggle,
    TvGrid,
  },
})
export default class Home extends Vue {
  private contentType = '';
  private clientIp = '';
  private tvShows = [] as any[];
  private loadingContent = true;

  private mounted() {
    this.loadShows();
    this.updateGridDisplay();
  }

  @Watch('$route.query.type')
  private updateGridDisplay() {
    this.contentType = this.$route.query.type as string;
  }

  private loadShows() {
    if (this.tvShows.length) { return; }
    this.loadingContent = true;
    axios.get('/api/shows').then((res: any) => {
      this.tvShows = res.data;
      this.loadingContent = false;
    }).catch(() => this.loadingContent = false);
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
