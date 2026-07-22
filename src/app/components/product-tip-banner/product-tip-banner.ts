import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ProductTipsService } from '../../services/product-tips.service';

@Component({
  selector: 'app-product-tip-banner',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './product-tip-banner.html',
  styleUrl: './product-tip-banner.scss',
})
export class ProductTipBanner {
  private tips = inject(ProductTipsService);
  private router = inject(Router);

  tip = this.tips.activeTip;

  dismiss() {
    const current = this.tip();
    if (current) {
      this.tips.dismiss(current.id);
    }
  }

  goCta() {
    const current = this.tip();
    if (current?.ctaRoute) {
      this.router.navigate([current.ctaRoute]);
    }
  }
}
