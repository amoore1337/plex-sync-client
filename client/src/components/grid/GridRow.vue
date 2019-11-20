<template>
  <tr class="grid-row" @click="toggleExpanded">
    <div class="row-values">
      <td v-if="isExpandable" class="expand-control">
        <div v-if="!expandableOffset" :class="{ caret: true, collapse: this.expanded }"></div>
      </td>
      <slot></slot>
    </div>
    <div class="row-expanded">
      <slot v-if="expanded" name="expanded"></slot>
    </div>
  </tr>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class GridRow extends Vue {
  @Prop() private expandableOffset!: boolean;

  private expanded = false;

  private get isExpandable() {
    return this.$slots.expanded || this.expandableOffset;
  }

  private toggleExpanded() {
    this.expanded = !this.expanded;
  }
}
</script>

<style scoped lang="scss">
  .grid-row {
    width: 100%;
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;

    .row-values {
      display: flex;
      flex-direction: row;
      width: 100%;
      height: 60px;
      align-items: center;
    }

    .expand-control {
      width: 25px;
    }

    .caret {
      transition: all 0.4s ease;
      width: 0;
      height: 0;
      border-top: 5px solid transparent;
      border-left: 7px solid black;
      border-bottom: 5px solid transparent;

      &.collapse {
        transform: rotate(90deg);
      }
    }
  }
</style>
