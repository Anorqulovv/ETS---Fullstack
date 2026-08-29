import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// @Global — homework, avatar (users), va kelajakda boshqa modullar (masalan
// shop-item rasmlari) bir xil StorageService'ni har birida qayta import qilmasdan
// ishlatishi uchun.
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
