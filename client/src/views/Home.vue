<template>
  <div class="home-container">
    <v-sheet class="top-nav" elevation="5">
      <h1>Plex Cache Manager</h1>
      <v-btn text icon @click="openSettings">
        <v-icon medium>mdi-tune</v-icon>
      </v-btn>
    </v-sheet>
    <div class="grid-container">
      <div class="grid-controls">
        <content-toggle></content-toggle>
      </div>
      <tv-grid v-bind:tvShows="content.tv" v-bind:loading="loadingContent" @refresh-requested="loadContent(true)" v-if="contentType === 'tv'"></tv-grid>
      <movies-grid v-bind:movies="content.movies" v-bind:loading="loadingContent" @refresh-requested="loadContent(true)" v-else></movies-grid>
    </div>
    <v-dialog v-model="showSettings" max-width="700">
      <v-card>
        <v-card-title>
          Settings
        </v-card-title>
        <v-card-text>
          <form @submit.prevent="saveConfig">
            <v-text-field class="name-input" v-model="managerIp" label="Manager IP" required></v-text-field>
            <v-text-field class="name-input" v-model="managerKey" label="Manager Key" required></v-text-field>
            <v-text-field class="name-input" v-model="managerSecret" label="Manager Secret" required></v-text-field>
            <v-text-field class="name-input" v-model="plexIp" label="Plex IP"></v-text-field>
            <v-text-field class="name-input" v-model="plexToken" label="Plex Token"></v-text-field>
          </form>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="showSettings = false">Cancel</v-btn>
          <v-btn color="primary" @click="saveConfig">
            <v-icon dark medium>mdi-content-save</v-icon>
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
  private showSettings = false;
  private managerIp = '';
  private managerKey = '';
  private managerSecret = '';
  private plexIp = '';
  private plexToken = '';

  private mounted() {
    this.updateGridDisplay();
  }

  @Watch('$route.query.type')
  private updateGridDisplay() {
    this.contentType = this.$route.query.type as string;
    this.loadContent();
  }

  private loadContent(force = false) {
    const routeMap: {[key: string]: string} = { tv: 'shows', movies: 'movies' };
    if (force || !this.content[this.contentType].length) {
      this.loadingContent = true;
      return axios.get(`/api/${routeMap[this.contentType]}`).then((res: any) => {
        this.content[this.contentType] = res.data;
        this.loadingContent = false;
      }).catch(() => this.loadingContent = false);
    }
  }

  private openSettings() {
    axios.get('/api/manager-config').then((response: any) => {
      if (response.data.manager) {
        this.managerIp = response.data.manager.hostname;
        this.managerKey = response.data.manager.client_id;
        this.managerSecret = response.data.manager.client_secret;
      }

      if (response.data.plex) {
        this.plexIp = response.data.plex.hostname;
        this.plexToken = response.data.plex.token;
      }

      this.showSettings = true;
    });
  }

  private saveConfig() {
    axios.post('/api/manager-config', {
      hostname: this.managerIp,
      client_id: this.managerKey,
      client_secret: this.managerSecret,
      plex_hostname: this.plexIp,
      plex_token: this.plexToken,
    });

    this.showSettings = false;
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

  .top-nav {
    display: flex;
    height: 80px;
    width: 100%;
    padding: 0 20px;
    align-items: center;
    justify-content: space-between;
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
