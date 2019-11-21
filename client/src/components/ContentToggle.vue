<template>
  <v-radio-group v-model="contentType" row @change="updateRoute">
      <v-radio label="TV Shows" value="tv" color="light-blue darken-1"></v-radio>
      <v-radio label="Movies" value="movies" color="light-blue darken-1"></v-radio>
    </v-radio-group>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class ContentToggle extends Vue {
  private contentType = 'tv';

  private mounted() {
    const selectedType = this.$route.query.type as string;
    if (selectedType && ['tv', 'movies'].indexOf(selectedType)) {
      this.contentType = selectedType;
    }
    this.updateRoute();
  }

  private updateRoute() {
    this.$router.replace({query: { type: this.contentType }});
  }
}
</script>

<style scoped lang="scss">
</style>
