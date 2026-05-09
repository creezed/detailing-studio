import type { UserSnapshot } from '@det/backend-iam-domain';

import type { LoginResponseDto } from '../../dto/login-response/login-response.dto';
import type { IJwtIssuer } from '../../ports/jwt-issuer/jwt-issuer.port';

export interface BuildLoginResponseProps {
  readonly jwtIssuer: IJwtIssuer;
  readonly refreshToken: string;
  readonly userSnapshot: UserSnapshot;
}

export async function buildLoginResponse(
  props: BuildLoginResponseProps,
): Promise<LoginResponseDto> {
  const { token: accessToken, expiresIn } = await props.jwtIssuer.issueAccessToken({
    branches: [...props.userSnapshot.branchIds],
    role: props.userSnapshot.role,
    sub: props.userSnapshot.id,
  });

  return {
    accessToken,
    expiresIn,
    refreshToken: props.refreshToken,
    user: {
      fullName: props.userSnapshot.fullName,
      id: props.userSnapshot.id,
      role: props.userSnapshot.role,
    },
  };
}
