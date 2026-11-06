import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-main-layout-no-footer',
  imports: [RouterOutlet, Navbar],
  templateUrl: './main-layout-no-footer.html',
  styleUrl: './main-layout-no-footer.css',
})
export class MainLayoutNoFooter {}