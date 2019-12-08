<template>
  <div class="remaining-space-indicator">
    <div v-if="loading" class="font-weight-light">Checking space requirements...</div>
    <div v-else class="available-server-space font-weight-light">
      (
        <span class="bytes font-weight-medium" :class="{ warn: remainingSpace < 2000000, danger: remainingSpace < 0 }">
          {{fileSystemStats.available_space | numFormat('0.0b')}}
        </span>
      available)
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { fileSystemService, IFileSystemStats } from '@/services/file-system.service';

@Component
export default class RemainingSpaceIndicator extends Vue {
  @Prop() private spaceRequired!: number;

  private loading = false;
  private fileSystemStats: IFileSystemStats = {};

  private async mounted() {
    this.loading = true;
    this.fileSystemStats = await fileSystemService.fetchAvailableServerSpace();
    this.loading = false;
  }

  private get remainingSpace() {
    return (this.fileSystemStats.available_space || 0) - this.spaceRequired;
  }
}
</script>

<style scoped lang="scss">
  .remaining-space-indicator {
    .available-server-space {
      .bytes {
        color: $green-darken-2;
        &.warn {
          color: $yellow-darken-2;
        }
        &.danger {
          color: $red-darken-4;
        }
      }
    }
  }
</style>
