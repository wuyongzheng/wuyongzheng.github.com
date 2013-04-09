#include <stdio.h>
#include <assert.h>
#include <stdlib.h>

int main (void)
{
	int inwidth, inheight, maxval, i, x, y;
	const int outwidth = 10456, outheight = 2664;
	unsigned short *inimg;

	assert(scanf("P6 %d %d %d ", &inwidth, &inheight, &maxval) == 3);
	assert(maxval == 65535);
	inimg = (unsigned short *)malloc(inwidth * inheight * 3 * sizeof(unsigned short));
	for (i = 0; i < inwidth * inheight * 3; i ++) {
		int c1 = getchar();
		int c2 = getchar();
		assert(c1 != EOF && c2 != EOF);
		inimg[i] = c2 + c1 * 256;
	}

	printf("P6\n%d %d\n65535\n", outwidth, outheight);
	for (y = 0; y < outheight; y ++) for (x = 0; x < outwidth; x ++) {
		double X = x / 10455.0 * 6239.0;
		double Y = y / 2663.0 * 1599.0;
		//double inx = 2.0764e+03*1 + 1.2831e+00*X + -1.9863e-01*Y + -6.6820e-06*X*X + 5.0894e-05*X*Y + 1.2982e-04*Y*Y + 7.0052e-10*X*X*X + 1.5387e-09*X*X*Y + -2.4003e-08*X*Y*Y + -2.3212e-08*Y*Y*Y;
		//double iny = 5.3965e+02*1 + 4.0559e-02*X + 1.1939e+00*Y + -1.0736e-05*X*X + 5.6039e-06*X*Y + -3.8481e-05*Y*Y + 1.2432e-09*X*X*X + -5.8218e-09*X*X*Y + 2.2915e-08*X*Y*Y + -3.5819e-08*Y*Y*Y;
		//double inx = 1.9898e+03*1 + 1.3420e+00*X + -6.8559e-02*Y + -1.8703e-05*X*X + -5.0530e-06*X*Y + 5.9110e-05*Y*Y + 1.5748e-09*X*X*X + 6.0810e-09*X*X*Y + -9.6947e-09*X*Y*Y + -8.2613e-09*Y*Y*Y;
		//double iny = 5.9421e+02*1 + -3.2313e-03*X + 1.1095e+00*Y + 8.1613e-06*X*X + 2.3740e-05*X*Y + 2.4393e-05*Y*Y + -1.6736e-09*X*X*X + -8.6399e-09*X*X*Y + 2.0527e-08*X*Y*Y + -5.3927e-08*Y*Y*Y;
		double inx = 2.0424e+03*1 + 1.2917e+00*X + -2.7655e-02*Y + -4.2315e-06*X*X + -1.1677e-05*X*Y + 1.9017e-05*Y*Y + 1.3623e-10*X*X*X + 7.1931e-09*X*X*Y + -8.2295e-09*X*Y*Y + 2.8473e-09*Y*Y*Y;
		double iny = 8.6934e+02*1 + -2.0350e-01*X + 1.1005e+00*Y + 5.7748e-05*X*X + 2.0617e-05*X*Y + 4.4242e-05*Y*Y + -5.8157e-09*X*X*X + -7.8813e-09*X*X*Y + 1.8222e-08*X*Y*Y + -5.7389e-08*Y*Y*Y;
		int inix = (int)(inx + 0.5);
		int iniy = (int)(iny + 0.5);
		for (i = 0; i < 3; i ++) {
			if (inix < 0 || inix >= inwidth || iniy < 0 || iniy >= inheight) {
				putchar(0);
				putchar(0);
			} else {
				putchar(inimg[iniy * inwidth * 3 + inix * 3 + i] / 256);
				putchar(inimg[iniy * inwidth * 3 + inix * 3 + i] % 256);
			}
		}
	}
	return 0;
}
