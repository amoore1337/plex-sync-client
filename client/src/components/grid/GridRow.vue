<template>
  <tr :class="['grid-row', { selectable, expanded: expanded && hasExpandableContent }]">
    <div class="row-values" @click="onRowClick">
      <td v-if="isExpandable" class="expand-control">
        <div v-if="!expandableOffset" :class="{ caret: true, collapse: this.expanded }"></div>
      </td>
      <slot></slot>
    </div>
    <v-expand-transition>
      <div v-show="expanded" class="row-expanded">
        <slot name="expanded"></slot>
      </div>
    </v-expand-transition>
  </tr>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class GridRow extends Vue {
  @Prop() private expandableOffset!: boolean;
  @Prop() private selectable!: boolean;

  private expanded = false;

  private get isExpandable() {
    return this.$slots.expanded || this.expandableOffset;
  }

  private get hasExpandableContent() {
    return this.$slots.expanded;
  }

  private onRowClick() {
    if (this.selectable) {
      this.$emit('row-clicked');
    }

    if (this.hasExpandableContent) {
      this.toggleExpanded();
    }
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
    box-sizing: border-box;

    &.selectable {
      &:hover {
        .row-values {
          cursor: pointer;
          background-color: $light-gray-4;
        }
      }
    }

    &.expanded {
      border: 2px solid $light-blue-lighten-1 !important;
    }

    .row-values {
      display: flex;
      flex-direction: row;
      width: 100%;
      height: 60px;
      align-items: center;
      padding: 0 20px;
    }

    .row-expanded {
      width: 100%;
      padding: 0 50px;
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
