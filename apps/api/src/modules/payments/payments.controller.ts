import { Body, Controller, Headers, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaymentsService } from './payments.service';
import { WompiSignatureDto } from './dto/wompi.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post('wompi/signature')
  wompiSignature(@Body() dto: WompiSignatureDto) {
    return { signature: this.payments.createWompiIntegritySignature(dto.reference, dto.amountInCents, dto.currency) };
  }

  @Post('wompi/webhook')
  wompiWebhook(@Body() body: any, @Headers('x-event-checksum') checksum?: string) {
    return this.payments.handleWompiWebhook(body, checksum);
  }
}
