import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database/database.module';
import { NotificationGateway } from './notification.gateway';
import { RealtimePublisherService } from './realtime-publisher.service';

// Global so any provider (application DAO, chat DAO) can inject
// RealtimePublisherService without wiring module imports through the DB layer.
// Imports DatabaseModule for the gateway's chat handlers (one-way edge — the
// DB layer reaches the publisher via the global provider, so no cycle).
@Global()
@Module({
	imports: [DatabaseModule],
	providers: [NotificationGateway, RealtimePublisherService],
	exports: [RealtimePublisherService]
})
export class RealtimeModule {}
