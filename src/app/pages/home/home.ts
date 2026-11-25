import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FeatureCard } from '../../shared/components/feature-card/feature-card';
import { Serve } from '../../shared/components/serve/serve';
import { Creators } from '../../shared/components/creators/creators';
import { Upcoming } from '../../shared/components/upcoming/upcoming';

// import { Slider } from '../../shared/components/slider/slider';
import { Recommended } from '../../shared/components/recommended/recommended';
import { ViewSpaces } from '../../shared/components/view-spaces/view-spaces';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    CommonModule,
    FeatureCard,
    Serve,
    // Creators,
    Recommended,
    Upcoming,
    // ViewSpaces,
  ],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
