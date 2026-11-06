# Original vector redraw inspired by the user's comic, not a cropped animation
# and not neural image/video generation. No external packages are required.
param([string]$Output = '', [switch]$Portrait, [switch]$Moon)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName PresentationCore
if (-not $Output) {
    $filename = if ($Portrait) { 'assets\heroes-standing.png' }
        elseif ($Moon) { 'assets\heroes-moon-dance.gif' }
        else { 'assets\heroes-dance.gif' }
    $Output = Join-Path (Split-Path $PSScriptRoot -Parent) $filename
}

Add-Type -ReferencedAssemblies @(
    'System.Drawing',
    'System.Xaml',
    [System.Windows.Media.Imaging.GifBitmapEncoder].Assembly.Location,
    [System.Windows.DependencyObject].Assembly.Location
) -TypeDefinition @'
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Globalization;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Color = System.Drawing.Color;
using Pen = System.Drawing.Pen;
using Brush = System.Drawing.Brush;
using LinearGradientBrush = System.Drawing.Drawing2D.LinearGradientBrush;
using PixelFormat = System.Drawing.Imaging.PixelFormat;

public static class HappyComicDance {
    const int Size = 640, FrameCount = 80, Delay = 7;
    static readonly Color Ink = Color.FromArgb(38, 32, 48);
    static readonly Color Pink = ColorTranslator.FromHtml("#ef76aa");
    static readonly Color LightPink = ColorTranslator.FromHtml("#fa94bf");
    static readonly Color DarkPink = ColorTranslator.FromHtml("#d95591");
    static readonly Color Skin = ColorTranslator.FromHtml("#f6d3ad");
    static readonly Color Cream = ColorTranslator.FromHtml("#fff8ec");
    static Graphics g;
    static bool standing;
    static bool moon;
    public static void UseMoon() { moon = true; }

    // Small SVG path reader keeps the hand-drawn outlines editable.
    static GraphicsPath Path(string data) {
        var tokens = Regex.Matches(data, @"[MLCQZ]|-?\d+(?:\.\d+)?");
        int index = 0;
        float x = 0, y = 0, sx = 0, sy = 0;
        char command = 'M';
        var path = new GraphicsPath();
        Func<float> next = () => float.Parse(tokens[index++].Value, CultureInfo.InvariantCulture);
        while (index < tokens.Count) {
            if (char.IsLetter(tokens[index].Value[0])) command = tokens[index++].Value[0];
            if (command == 'Z') {
                path.CloseFigure(); x = sx; y = sy;
                continue;
            }
            if (command == 'M') {
                x = next(); y = next(); sx = x; sy = y;
                path.StartFigure(); command = 'L';
            } else if (command == 'L') {
                float nx = next(), ny = next();
                path.AddLine(x, y, nx, ny); x = nx; y = ny;
            } else if (command == 'C') {
                float a = next(), b = next(), c = next(), d = next(), nx = next(), ny = next();
                path.AddBezier(x, y, a, b, c, d, nx, ny); x = nx; y = ny;
            } else if (command == 'Q') {
                float a = next(), b = next(), nx = next(), ny = next();
                path.AddBezier(x, y, x + (a-x)*2/3, y + (b-y)*2/3,
                    nx + (a-nx)*2/3, ny + (b-ny)*2/3, nx, ny);
                x = nx; y = ny;
            }
        }
        return path;
    }

    static void Shape(string data, Color fill, float width = 3.4f) {
        using (var path = Path(data))
        using (var brush = new SolidBrush(fill))
        using (var pen = new Pen(Ink, width)) {
            pen.LineJoin = LineJoin.Round;
            pen.StartCap = pen.EndCap = LineCap.Round;
            g.FillPath(brush, path);
            if (width > 0) g.DrawPath(pen, path);
        }
    }

    static void Stroke(string data, Color color, float width = 2.7f) {
        using (var path = Path(data))
        using (var pen = new Pen(color, width)) {
            pen.LineJoin = LineJoin.Round;
            pen.StartCap = pen.EndCap = LineCap.Round;
            g.DrawPath(pen, path);
        }
    }

    static void Oval(float x, float y, float w, float h, Color fill, float width = 3) {
        using (var brush = new SolidBrush(fill)) g.FillEllipse(brush, x, y, w, h);
        if (width > 0) using (var pen = new Pen(Ink, width)) g.DrawEllipse(pen, x, y, w, h);
    }

    static void Spark(float x, float y, float scale, float angle, Color fill) {
        var state = g.Save();
        g.TranslateTransform(x, y); g.RotateTransform(angle); g.ScaleTransform(scale, scale);
        Shape("M0 -12 Q2 -2 10 0 Q2 2 0 12 Q-2 2 -10 0 Q-2 -2 0 -12 Z", fill, 0);
        g.Restore(state);
    }

    static void Note(float x, float y, float angle, float scale) {
        var state = g.Save();
        g.TranslateTransform(x,y); g.RotateTransform(angle); g.ScaleTransform(scale,scale);
        var color = Color.FromArgb(180, 177, 63, 123);
        Stroke("M-4 10 L-4 -17 L15 -22 L15 5 M-4 -11 L15 -16", color, 3);
        Oval(-15,6,12,8,color,0); Oval(4,1,12,8,color,0);
        g.Restore(state);
    }

    static void Background(double t) {
        if (moon) { MoonBackground(t); return; }
        using (var bg = new LinearGradientBrush(new Point(0,0), new Point(0,Size),
            Color.FromArgb(255,233,242), Color.FromArgb(249,184,215))) {
            g.FillRectangle(bg,0,0,Size,Size);
        }
        using (var brush = new SolidBrush(Color.FromArgb(42,255,255,255))) {
            g.FillEllipse(brush,70,104,510,470);
        }
        float pulse = (float)Math.Sin(t);
        Spark(81,139,0.9f + pulse*0.12f,10,Color.White);
        Spark(556,149,1.05f - pulse*0.13f,-8,Color.White);
        Spark(333,104,0.7f + pulse*0.12f,12,Color.FromArgb(255,244,175));
        Spark(597,396,0.6f - pulse*0.10f,18,Color.White);
        Spark(55,435,0.65f + pulse*0.1f,-5,Color.White);
        if (!standing) {
            Note(89,233 + pulse*5,-16,0.8f);
            Note(552,261 - pulse*6,16,0.85f);
            Note(332,180 + pulse*5,5,0.65f);
        }
        Oval(111,563,205 - Math.Abs(pulse)*13,22,Color.FromArgb(30,119,43,89),0);
        Oval(403,565,127 - Math.Abs(pulse)*9,16,Color.FromArgb(28,119,43,89),0);
    }

    static void Shoe() {
        Shape("M-14 47 L13 47 L19 57 Q31 57 40 66 Q44 71 38 76 L-17 76 Q-22 72 -21 66 Z",Pink);
        Stroke("M-18 70 Q9 74 40 70",Ink,2.6f);
        Stroke("M10 56 L22 59 M8 62 L21 64 M-14 49 L9 49",Ink,2.1f);
        Stroke("M-11 72 L-11 75 M28 72 L28 75",DarkPink,2);
    }

    static void Leg(float x, double phase, bool mirror) {
        var state = g.Save();
        g.TranslateTransform(x,42);
        g.RotateTransform((float)(Math.Sin(phase)*15));
        if (mirror) g.ScaleTransform(-1,1);
        Shape("M-23 -4 Q-28 12 -24 38 L-18 70 Q-1 82 18 68 L25 28 L24 -3 Z",Skin);
        Shape("M-29 -7 L25 -7 L27 27 Q8 35 -26 28 Z",Pink);
        Stroke("M-24 23 Q-1 28 23 23",DarkPink,2.2f);
        Stroke("M-13 43 L-14 47 M-3 37 L-2 41 M8 45 L9 49 M-8 58 L-7 62 M11 57 L12 61",Ink,1.6f);
        var knee = g.Save();
        g.TranslateTransform(0,64);
        g.RotateTransform((float)(Math.Max(0, Math.Sin(phase))*22));
        Shape("M-18 -6 Q-20 16 -14 38 L-14 53 L14 53 L16 18 L18 -6 Q0 2 -18 -6 Z",Skin);
        Shape("M-16 24 Q0 29 17 24 L16 52 Q0 57 -16 51 Z",Cream,2.8f);
        Stroke("M-14 30 Q1 35 16 30 M-8 38 L-8 43 M0 39 L0 44 M8 38 L8 43",Ink,1.6f);
        Shoe();
        g.Restore(knee);
        g.Restore(state);
    }

    static void Hand() {
        Shape("M-13 37 L-12 50 Q-25 44 -27 49 Q-29 54 -17 65 L-16 76 Q-13 89 -6 90 L12 89 Q19 86 20 77 L23 54 Q23 47 18 48 L14 67 L15 43 Q15 37 10 39 L7 64 L7 38 Q7 32 2 35 L0 63 L-1 39 Q-3 32 -7 37 L-7 64 L-9 42 Z",Skin,2.8f);
        Stroke("M-13 72 Q-7 67 -2 69",Ink,1.7f);
    }

    static void Arm(int side, double t) {
        var state = g.Save();
        g.TranslateTransform(side*61,-111);
        // The moon scene follows the reference pose: both open hands are thrown upward.
        g.RotateTransform(standing ? -side*11 : moon
            ? (float)(-side*(138 + Math.Sin(t + side*0.9)*25))
            : (float)(-side*53 + Math.Sin(t)*21));
        // The complete upper arm, elbow, forearm and hand are drawn separately:
        // no sliced source image or missing joints when the pose changes.
        Shape("M-21 -8 Q0 -19 21 -6 L23 47 Q4 59 -21 46 Z",Pink);
        Stroke("M-16 2 Q-11 18 -15 31 M15 10 L17 32",DarkPink,2.2f);
        Shape("M-23 37 Q0 48 24 37 L24 53 Q0 65 -24 52 Z",LightPink,2.8f);
        var elbow = g.Save();
        g.TranslateTransform(0,49);
        g.RotateTransform((float)(side*(18 + 22*Math.Sin(t + side*0.5))));
        Shape("M-15 -3 L-14 45 Q0 54 15 45 L17 -3 Q0 4 -15 -3 Z",Skin,2.9f);
        Hand();
        g.Restore(elbow);
        g.Restore(state);
    }

    static void Head(double t) {
        var state = g.Save();
        g.TranslateTransform(0,-128);
        g.RotateTransform((float)(Math.Sin(t)*5));
        Shape("M-42 -3 Q-48 -26 -42 -56 L-50 -115 L-21 -83 Q0 -89 20 -82 L46 -116 L40 -54 Q48 -24 38 -5 Q18 17 0 18 Q-23 17 -42 -3 Z",Pink);
        Shape("M-32 -13 Q-29 -34 0 -31 Q28 -32 32 -13 Q32 12 0 16 Q-29 10 -32 -13 Z",Skin,2.8f);
        // Lifted brows and curved, closed eyes replace the comic's tired look.
        Stroke("M-34 -49 Q-23 -55 -13 -48 M13 -48 Q25 -55 34 -49",Ink,2.8f);
        Stroke("M-32 -35 Q-23 -46 -13 -35 M13 -35 Q23 -46 32 -35",Ink,3.5f);
        Shape("M-12 -7 Q0 -1 15 -8 Q13 10 0 11 Q-11 8 -12 -7 Z",Ink,1.8f);
        Shape("M-10 -6 Q1 -3 12 -7 L9 -1 Q-1 2 -9 -1 Z",Cream,0);
        Shape("M-6 -27 Q0 -34 7 -27 L12 -18 Q1 -13 -9 -18 Z",Skin,2.3f);
        Shape("M0 -18 Q-11 -23 -19 -15 Q-30 -5 -42 -12 Q-35 3 -21 0 Q-8 -1 0 -9 Q10 1 24 0 Q38 -1 43 -12 Q31 -5 20 -15 Q11 -24 0 -18 Z",Cream,2.5f);
        Stroke("M-14 5 Q0 11 14 4",DarkPink,1.3f);
        Oval(-39,-25,10,5,Color.FromArgb(100,230,100,135),0);
        Oval(29,-25,10,5,Color.FromArgb(100,230,100,135),0);
        g.Restore(state);
    }

    static void Batman(double t) {
        var state = g.Save();
        // Lower lunar gravity means higher, floatier hops.
        float bounce = (float)((moon ? -15 : -7)*(1-Math.Cos(t*2)));
        g.TranslateTransform((moon ? 200 : 216) + (float)Math.Sin(t)*9,371+bounce);
        g.RotateTransform((float)(Math.Sin(t)*4.5));
        // Black lining, pink edge and scalloped hem of the character's cape.
        float flutter = (float)Math.Sin(t+0.7)*10;
        var cape = g.Save();
        g.TranslateTransform(flutter,0);
        Shape("M-52 -135 Q-94 -93 -112 7 Q-120 54 -125 106 Q-97 84 -79 111 Q-49 88 -21 112 Q8 88 42 106 Q53 7 43 -123 Z",Pink);
        Shape("M-47 -119 Q-90 -57 -106 79 Q-81 63 -64 91 Q-42 72 -22 91 Q1 71 26 88 L37 -117 Z",Ink,2);
        Stroke("M-54 -82 Q-79 -25 -86 46 M-32 -51 Q-46 3 -47 56",DarkPink,2);
        g.Restore(cape);
        Leg(-38,t,false);
        Leg(37,t+Math.PI,true);
        Shape("M-54 -128 Q0 -147 53 -127 Q77 -96 69 -40 L64 20 Q40 43 0 42 Q-40 42 -65 19 L-69 -52 Q-74 -100 -54 -128 Z",Pink);
        Shape("M-25 -125 Q0 -132 26 -125 L30 -11 Q1 4 -29 -9 Z",Cream,2.4f);
        for (int i=0; i<11; i++) {
            int y=-114+i*9;
            Stroke("M-24 "+y+" Q0 "+(y+5)+" 27 "+y,Ink,2.1f);
        }
        Shape("M-27 -9 Q1 0 29 -10 L32 16 Q4 35 -34 16 Z",Skin,2.8f);
        Stroke("M3 11 Q-1 16 4 17",Ink,1.8f);
        Shape("M-52 -123 L-28 -133 L-21 -101 L-41 -109 L-29 -84 L-65 -31 Q-68 -93 -52 -123 Z",LightPink);
        Shape("M50 -123 L28 -133 L23 -101 L42 -108 L31 -86 L66 -30 Q70 -92 50 -123 Z",LightPink);
        Shape("M-64 16 Q0 30 65 16 L62 47 Q27 61 0 51 Q-29 60 -63 46 Z",Pink);
        Stroke("M0 28 L0 50 M-50 37 L-33 42 M35 41 L51 36",DarkPink,2.3f);
        Arm(-1,t);
        Arm(1,t);
        Head(t);
        if (moon) {
            Oval(-18,-123,36,32,Cream,2.8f);
            Shape("M0 -97 Q-15 -107 -9 -116 Q-3 -121 0 -113 Q3 -121 9 -116 Q15 -107 0 -97 Z",LightPink,2);
        } else {
            Oval(-20,-118,40,24,Cream,2.2f);
            Shape("M-15 -108 L-12 -113 L-6 -109 L-3 -114 L0 -110 L3 -114 L7 -109 L13 -113 L15 -108 Q8 -109 7 -101 Q0 -107 -7 -101 Q-8 -109 -15 -108 Z",Pink,0);
        }
        g.Restore(state);
    }

    static void BirdLeg(int side, double phase) {
        var state = g.Save();
        g.TranslateTransform(side*16,31);
        g.RotateTransform((float)(Math.Sin(phase)*18));
        // Outline and inner stroke keep the fine legs readable in the GIF.
        Stroke("M0 0 L"+(side*10)+" 58",Ink,8);
        Stroke("M0 0 L"+(side*10)+" 58",Pink,4.7f);
        g.TranslateTransform(side*10,58);
        g.RotateTransform((float)(Math.Max(0,Math.Sin(phase))*-30));
        Stroke("M0 -2 L-5 60",Ink,8);
        Stroke("M0 -2 L-5 60",Pink,4.7f);
        Shape("M-8 56 Q-4 54 0 58 L16 67 Q20 71 15 72 L-3 66 L-16 73 Q-22 75 -20 70 L-12 61 L-25 66 Q-30 66 -26 62 Z",LightPink,2.5f);
        g.Restore(state);
    }

    static void Wing(int side, double t) {
        var state = g.Save();
        g.TranslateTransform(side*24,-14);
        g.ScaleTransform(side,1);
        if (standing) {
            // Relaxed, folded feathers rather than an animated outstretched wing.
            Shape("M-8 -12 Q17 -23 28 -1 Q39 23 24 50 L16 38 L13 53 L4 39 L-1 49 Q-18 24 -8 -12 Z",Pink);
            Stroke("M0 1 Q12 18 13 36 M9 -3 Q23 13 24 30 M-6 12 Q0 29 1 37",Ink,2.2f);
            Stroke("M-7 -4 Q0 -10 8 -8",LightPink,3);
            g.Restore(state);
            return;
        }
        g.RotateTransform((float)(-8 + Math.Sin(t+0.35)*19));
        Shape("M0 12 C20 -12 63 -40 92 -84 Q108 -98 104 -81 L84 -52 Q122 -85 111 -60 L88 -35 Q126 -58 107 -34 L82 -14 Q118 -31 99 -7 L72 10 Q102 0 78 22 L43 39 Q12 54 0 12 Z",Pink);
        Stroke("M18 17 Q36 0 64 -12 M34 23 L58 10 M43 -7 L73 -29 M57 -28 L79 -47",Ink,2.2f);
        Stroke("M8 15 Q14 -1 31 -13",LightPink,3);
        g.Restore(state);
    }

    static void BirdNeck(double t) {
        var state = g.Save();
        g.TranslateTransform(-8,-11);
        g.RotateTransform((float)(Math.Sin(t)*9));
        Shape("M-7 17 Q-39 0 -41 -25 Q-44 -46 -29 -69 Q-14 -92 -22 -116 Q-49 -124 -47 -144 Q-43 -163 -24 -162 Q-1 -161 1 -142 Q4 -123 -8 -111 Q3 -84 -11 -58 Q-25 -34 -17 -19 Q-12 -12 1 -10 Z",Pink);
        // White, hooked beak with black tip, facing the dance partner.
        Shape("M-39 -154 Q-70 -170 -87 -151 Q-95 -141 -94 -133 Q-79 -147 -67 -139 L-60 -125 L-43 -133 Q-35 -143 -39 -154 Z",Cream,2.8f);
        Shape("M-69 -141 Q-89 -142 -94 -133 Q-99 -121 -98 -112 Q-83 -127 -60 -125 Z",Ink,2);
        Stroke("M-61 -151 Q-53 -149 -49 -145",Ink,1.7f);
        // Happy crescent eye and a lifted brow.
        Stroke("M-35 -140 Q-25 -149 -17 -139 M-34 -151 Q-24 -157 -16 -150",Ink,2.6f);
        Oval(-23,-132,11,6,LightPink,0);
        Stroke("M-32 -24 Q-30 -11 -20 -7",DarkPink,2);
        g.Restore(state);
    }

    static void Flamingo(double t) {
        var state = g.Save();
        g.TranslateTransform((moon ? 478 : 464) + (float)Math.Sin(t)*8,413 - (float)((moon ? 13 : 6)*(1-Math.Cos(t*2))));
        g.RotateTransform((float)(-Math.Sin(t)*4));
        Wing(1,t);
        BirdLeg(-1,t+Math.PI);
        BirdLeg(1,t);
        BirdNeck(t);
        Shape("M-37 -24 Q-24 -43 0 -35 Q29 -45 43 -21 Q55 3 40 29 L52 45 Q35 42 30 35 Q13 54 -13 43 Q-45 41 -49 11 Q-52 -11 -37 -24 Z",Pink);
        Shape("M-26 24 Q0 42 27 22 Q23 48 -1 46 Q-21 44 -26 24 Z",DarkPink,0);
        Stroke("M-15 25 L-20 32 M-3 29 L-4 38 M10 28 L12 36 M26 18 L30 25",Ink,2);
        Wing(-1,t);
        g.Restore(state);
    }

    static Bitmap Render(int frame, bool fullResolution = false) {
        double t = frame * Math.PI * 6 / FrameCount; // Three seamless dance phrases.
        using (var large = new Bitmap(Size*2,Size*2,PixelFormat.Format32bppArgb)) {
            using (g = Graphics.FromImage(large)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.ScaleTransform(2,2);
                Background(t);
                Batman(t);
                Flamingo(t);
            }
            if (fullResolution) return (Bitmap)large.Clone();
            var bitmap = new Bitmap(Size,Size,PixelFormat.Format32bppArgb);
            using (var down = Graphics.FromImage(bitmap)) {
                down.InterpolationMode = InterpolationMode.HighQualityBicubic;
                down.CompositingMode = CompositingMode.SourceCopy;
                down.DrawImage(large,0,0,Size,Size);
            }
            return bitmap;
        }
    }

    public static void GeneratePortrait(string output) {
        System.Threading.Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
        standing = true;
        try {
            using (var bitmap = Render(0,true)) {
                bitmap.SetResolution(144,144);
                bitmap.Save(output,ImageFormat.Png);
            }
        } finally {
            standing = false;
        }
        Console.WriteLine("Portrait: {0}; 1280x1280 PNG",output);
    }

    public static void Generate(string output) {
        System.Threading.Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;
        var encoder = new GifBitmapEncoder();
        for (int frame=0; frame<FrameCount; frame++) {
            using (var bitmap = Render(frame)) {
                if (frame == 0) bitmap.Save(System.IO.Path.ChangeExtension(output,"preview.png"),ImageFormat.Png);
                var data = bitmap.LockBits(new Rectangle(0,0,Size,Size),
                    ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
                var pixels = new byte[data.Stride*Size];
                Marshal.Copy(data.Scan0,pixels,0,pixels.Length);
                int stride = data.Stride;
                bitmap.UnlockBits(data);
                var source = BitmapSource.Create(Size,Size,96,96,PixelFormats.Bgra32,null,pixels,stride);
                if (source.CanFreeze) source.Freeze();
                var palette = new BitmapPalette(source,256);
                var indexed = new FormatConvertedBitmap(source,PixelFormats.Indexed8,palette,0);
                if (indexed.CanFreeze) indexed.Freeze();
                encoder.Frames.Add(BitmapFrame.Create(indexed));
            }
        }
        using (var stream = new MemoryStream()) {
            encoder.Save(stream);
            byte[] gif = stream.ToArray();
            // WPF's GIF encoder can silently discard frame metadata.
            // Write real GIF89a control blocks, rather than trusting metadata.
            int tableSize = (gif[10]&128) != 0 ? 3*(1<<((gif[10]&7)+1)) : 0;
            int offset = 13 + tableSize;
            byte[] loop = { 0x21,0xff,0x0b,78,69,84,83,67,65,80,69,50,46,48,3,1,0,0,0 };
            using (var file = File.Create(output)) {
                file.Write(gif,0,offset);
                file.Write(loop,0,loop.Length);
                int position = offset, images = 0;
                while (position < gif.Length) {
                    int start = position;
                    byte marker = gif[position++];
                    if (marker == 0x3b) { file.WriteByte(marker); break; }
                    if (marker == 0x21) {
                        byte label = gif[position++];
                        while (gif[position] != 0) position += 1 + gif[position];
                        position++;
                        if (label != 0xf9) file.Write(gif,start,position-start);
                    } else if (marker == 0x2c) {
                        byte packed = gif[start+9];
                        position = start+10;
                        if ((packed&128) != 0) position += 3*(1<<((packed&7)+1));
                        position++; // LZW minimum code size.
                        while (gif[position] != 0) position += 1+gif[position];
                        position++;
                        // Disposal 1, no transparency, 7 centiseconds = 70ms.
                        byte[] control = { 0x21,0xf9,4,4,(byte)Delay,0,0,0 };
                        file.Write(control,0,control.Length);
                        file.Write(gif,start,position-start);
                        images++;
                    } else {
                        throw new InvalidDataException("Unexpected GIF block.");
                    }
                }
                if (images != FrameCount) throw new InvalidDataException("Wrong GIF frame count.");
            }
        }
        Console.WriteLine("GIF: {0}; {1}x{1}; {2} frames; {3:F2}s",output,Size,FrameCount,FrameCount*Delay/100.0);
    }
    static void Star(float x, float y, float r, Color fill) {
        var points = new PointF[10];
        for (int i=0; i<10; i++) {
            double a = -Math.PI/2 + i*Math.PI/5;
            float radius = i%2 == 0 ? r : r*0.46f;
            points[i] = new PointF(x + (float)Math.Cos(a)*radius, y + (float)Math.Sin(a)*radius);
        }
        using (var brush = new SolidBrush(fill)) g.FillPolygon(brush, points);
        using (var pen = new Pen(Ink, 2.2f)) { pen.LineJoin = LineJoin.Round; g.DrawPolygon(pen, points); }
    }

    static void Crater(float x, float y, float w, float h) {
        Oval(x,y,w,h,ColorTranslator.FromHtml("#fff2a1"),2.2f);
        Oval(x+w*0.12f,y+h*0.2f,w*0.76f,h*0.62f,ColorTranslator.FromHtml("#24244d"),2.2f);
        Stroke("M"+(x+w*0.2f)+" "+(y+h*0.82f)+" L"+(x+w*0.28f)+" "+(y+h*0.98f)+
            " M"+(x+w*0.45f)+" "+(y+h*0.86f)+" L"+(x+w*0.5f)+" "+(y+h*1.0f)+
            " M"+(x+w*0.7f)+" "+(y+h*0.82f)+" L"+(x+w*0.76f)+" "+(y+h*0.96f),Ink,1.6f);
    }

    static void MoonBackground(double t) {
        using (var sky = new LinearGradientBrush(new Point(0,0), new Point(0,Size),
            ColorTranslator.FromHtml("#2b2a63"), ColorTranslator.FromHtml("#3b3475"))) {
            g.FillRectangle(sky,0,0,Size,Size);
        }
        var rnd = new Random(31);
        using (var white = new SolidBrush(Color.FromArgb(235,255,255,255))) {
            for (int i=0; i<78; i++) {
                float x = rnd.Next(8,Size-8), y = rnd.Next(8,455);
                float r = 0.8f + (float)rnd.NextDouble()*1.4f;
                g.FillEllipse(white,x-r,y-r,r*2,r*2);
            }
        }
        float p1 = (float)Math.Sin(t*2), p2 = (float)Math.Sin(t*2+1.7), p3 = (float)Math.Sin(t*2+3.1);
        Color star = ColorTranslator.FromHtml("#ffe84e");
        Star(52,70,15+p1*2,star); Star(274,42,17+p2*2,star); Star(388,118,16+p3*2,star);
        Star(594,205,15-p1*2,star); Star(34,341,14+p2*2,star); Star(628,438,12+p3*2,star);
        Star(409,505,12-p2*2,star);

        // Earth in the upper corner, outlined like the rest of the comic.
        var earth = g.Save();
        using (var circle = new GraphicsPath()) {
            circle.AddEllipse(485,34,126,126);
            g.SetClip(circle);
            using (var water = new SolidBrush(ColorTranslator.FromHtml("#4d97dc"))) g.FillPath(water,circle);
            Shape("M486 74 Q505 54 532 68 Q552 62 548 84 Q528 99 536 122 Q508 130 495 108 Q480 94 486 74 Z",ColorTranslator.FromHtml("#8cc652"),2);
            Shape("M561 45 Q594 50 612 77 Q610 101 586 98 Q568 118 575 150 Q548 138 562 108 Q536 82 561 45 Z",ColorTranslator.FromHtml("#8cc652"),2);
            Shape("M512 116 Q540 109 567 131 Q553 158 523 150 Z",ColorTranslator.FromHtml("#9bd35a"),2);
            Shape("M497 72 Q511 59 528 68 Q535 82 520 88 Q500 88 497 72 Z",Cream,1.8f);
            g.ResetClip();
        }
        Oval(485,34,126,126,Color.Transparent,3.2f);
        g.Restore(earth);

        using (var moonBrush = new SolidBrush(ColorTranslator.FromHtml("#f7eb9d")))
        using (var horizon = Path("M-8 462 Q74 442 166 459 Q251 476 335 455 Q438 434 520 458 Q590 440 650 454 L650 650 L-8 650 Z")) {
            g.FillPath(moonBrush,horizon);
            using (var pen = new Pen(Ink,3.2f)) { pen.LineJoin = LineJoin.Round; g.DrawPath(pen,horizon); }
        }
        Crater(-18,472,120,22); Crater(530,468,124,22); Crater(38,583,170,34);
        Crater(428,590,190,36); Crater(258,507,86,12);
        string[] rocks = {"72 555","152 521","318 604","378 530","598 553","492 621","211 625"};
        foreach (var rock in rocks) {
            var xy = rock.Split(' ');
            float rx = float.Parse(xy[0]), ry = float.Parse(xy[1]);
            Stroke("M"+rx+" "+ry+" Q"+(rx+9)+" "+(ry-9)+" "+(rx+20)+" "+ry+" Q"+(rx+27)+" "+(ry-5)+" "+(rx+35)+" "+ry,Ink,2.1f);
        }
        float pulse = (float)Math.Sin(t);
        Oval(103,552,214 - Math.Abs(pulse)*20,24,Color.FromArgb(78,27,26,60),0);
        Oval(398,553,132 - Math.Abs(pulse)*12,17,Color.FromArgb(70,27,26,60),0);
    }
}
'@
if ($Moon) { [HappyComicDance]::UseMoon() }
if ($Portrait) {
    [HappyComicDance]::GeneratePortrait([IO.Path]::GetFullPath($Output))
} else {
    [HappyComicDance]::Generate([IO.Path]::GetFullPath($Output))
}
