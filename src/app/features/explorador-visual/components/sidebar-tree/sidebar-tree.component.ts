import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BaseTreeNode, SchemaTreeNode, TabelaResumo } from '../../models/explorador-visual.model';

@Component({
  selector: 'app-explorador-sidebar-tree',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  templateUrl: './sidebar-tree.component.html',
  styleUrl: './sidebar-tree.component.scss',
})
export class SidebarTreeComponent {
  @Input() bases: BaseTreeNode[] = [];
  @Input() selectedBase = '';
  @Input() selectedSchema = '';
  @Input() selectedTableId = '';
  @Input() loadingBases = false;
  @Output() baseToggle = new EventEmitter<BaseTreeNode>();
  @Output() schemaToggle = new EventEmitter<{ base: BaseTreeNode; schema: SchemaTreeNode }>();
  @Output() tableSelected = new EventEmitter<{
    base: BaseTreeNode;
    schema: SchemaTreeNode;
    tabela: TabelaResumo;
  }>();
  @Output() schemaSelected = new EventEmitter<{ base: BaseTreeNode; schema: SchemaTreeNode }>();
  
  ngOnInit() {
    console.log('SidebarTreeComponent initialized with bases:', this.bases);
  }
}
