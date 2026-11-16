import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { brand } from '../../theme/tokens';

export type BrandSurface = 'light' | 'dark';

const MARK = { light: '/brand/adalex-mark.png', dark: '/brand/adalex-mark-white.png' } as const;
const LOGO = { light: '/brand/adalex-logo.png', dark: '/brand/adalex-logo-white.png' } as const;
const LOGO_RATIO = 1316 / 362;

interface BrandMarkProps {
  /** The surface the mark sits on: `dark` = navy surface (white artwork). In dark colour mode always pass `dark`. */
  variant: BrandSurface;
  collapsed?: boolean;
}

/** Diamond mark with the "ICEPac / by Adalex Consulting" lockup. */
export const BrandMark: React.FC<BrandMarkProps> = ({ variant, collapsed = false }) => {
  const [failed, setFailed] = useState(false);
  const onDark = variant === 'dark';

  if (collapsed) {
    return failed ? null : (
      <Box
        component="img"
        src={MARK[variant]}
        alt="ICEPac by Adalex Consulting"
        onError={() => setFailed(true)}
        sx={{ width: 32, height: 32, display: 'block' }}
      />
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: onDark ? 'common.white' : 'text.primary' }}>
      {!failed && (
        <Box
          component="img"
          src={MARK[variant]}
          alt=""
          onError={() => setFailed(true)}
          sx={{ width: 32, height: 32, display: 'block', flexShrink: 0 }}
        />
      )}
      <Box>
        <Typography component="div" sx={{ fontWeight: 700, fontSize: '1.125rem', lineHeight: 1.2, color: 'inherit' }}>
          ICEPac
        </Typography>
        <Typography
          variant="overline"
          component="div"
          sx={{ lineHeight: 1.4, display: 'block', color: onDark ? brand.gold : brand.goldText }}
        >
          by Adalex Consulting
        </Typography>
      </Box>
    </Box>
  );
};

interface AdalexLogoProps {
  variant: BrandSurface;
  /** Rendered height in px (minimum 24). */
  height?: number;
}

/** Full Adalex Consulting logo. Hidden entirely if the file fails to load. */
export const AdalexLogo: React.FC<AdalexLogoProps> = ({ variant, height = 28 }) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  const h = Math.max(24, height);
  return (
    <Box
      component="img"
      src={LOGO[variant]}
      alt="Adalex Consulting"
      onError={() => setFailed(true)}
      sx={{ height: h, width: h * LOGO_RATIO, display: 'block' }}
    />
  );
};

export default BrandMark;
