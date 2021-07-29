import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { UrlSyncDirective } from "./url-sync.directive";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { QueryParamSyncService } from "./query-param-sync.service";

@NgModule({
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  declarations: [UrlSyncDirective],
  exports: [UrlSyncDirective],
  providers: [QueryParamSyncService]
})
export class QueryParamSyncModule {}
