/* Research-only extractor, using JPEXS 26.4.0 as an external development tool.
 * java -Djava.awt.headless=true -cp /path/to/ffdec.jar Bounds.java original.swf
 * Output: factual local display bounds; no artwork or ActionScript is emitted.
 */
import java.io.*;
import java.awt.geom.*;
import java.security.MessageDigest;
import java.util.*;
import com.jpexs.decompiler.flash.SWF;
import com.jpexs.decompiler.flash.tags.*;
import com.jpexs.decompiler.flash.tags.base.*;
import com.jpexs.decompiler.flash.exporters.commonshape.Matrix;

public class Bounds {
    private static final String SHA = "7b5467a3eccc17f6dd001ff2d41bdf1b03d79fd515a2a9586c42bfd982bb1e23";
    private static final String[] NAMES = {"goblin", "orc", "wolf", "shaman", "ogre", "bandit", "brigand", "arrow", "barSmall", "barMedium"};
    private static final String[] CLASSES = {"EnemyGoblin", "EnemyFatOrc", "EnemyWolfSmall", "EnemyShaman", "EnemyOgre", "EnemyBandit", "EnemyBrigand", "Arrow", "LifeBarSmall", "LifeBarMedium"};

    // Compose transforms before measuring leaves, avoiding repeated rotated-AABB expansion.
    private static Rectangle2D bounds(CharacterTag character, int age, AffineTransform transform, int depth) {
        if (depth > 30) throw new IllegalArgumentException("Unexpected recursive display list");
        if (character instanceof DefineSpriteTag sprite) {
            Rectangle2D result = null;
            var timeline = sprite.getTimeline();
            var frame = timeline.getFrame(Math.floorMod(age, timeline.getFrameCount()));
            for (var state : frame.layers.values()) {
                var child = state.getCharacter();
                if (child == null) continue;
                var childTransform = new AffineTransform(transform);
                childTransform.concatenate(new Matrix(state.getDrawingMatrix()).toTransform());
                var childBounds = bounds(child, state.time, childTransform, depth + 1);
                if (childBounds != null) result = result == null ? childBounds : result.createUnion(childBounds);
            }
            return result;
        }
        if (character instanceof BoundedTag bounded) {
            var rect = bounded.getRect();
            return transform.createTransformedShape(new Rectangle2D.Double(rect.Xmin, rect.Ymin,
                rect.Xmax - rect.Xmin, rect.Ymax - rect.Ymin)).getBounds2D();
        }
        return null;
    }

    private static SWF game(SWF swf) {
        if (swf.getCharacterByClass("EnemyGoblin") != null) return swf;
        for (var character : swf.getCharacters(false).values()) {
            if (character instanceof DefineBinaryDataTag binary && binary.isSwfData()) {
                binary.loadEmbeddedSwf();
                var found = game(binary.innerSwf);
                if (found != null) return found;
            }
        }
        return null;
    }

    public static void main(String[] args) throws Exception {
        byte[] bytes = java.nio.file.Files.readAllBytes(java.nio.file.Path.of(args[0]));
        if (!SHA.equals(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes))))
            throw new IllegalArgumentException("Publisher Flash v1.13 hash mismatch");
        var swf = game(new SWF(new ByteArrayInputStream(bytes), false));
        if (swf == null) throw new IllegalArgumentException("Game symbols were not found");
        System.out.print("{\"edition\":\"Armor Games Flash v1.13\",\"sha256\":\"" + SHA +
            "\",\"units\":\"Flash pixels, local symbol coordinates\",\"symbols\":{");
        for (int i = 0; i < NAMES.length; i++) {
            if (i > 0) System.out.print(",");
            var sprite = (DefineSpriteTag) swf.getCharacterByClass(CLASSES[i]);
            var frames = sprite.getTimeline().getFrames();
            System.out.print("\"" + NAMES[i] + "\":{\"frames\":[");
            for (int f = 0; f < frames.size(); f++) {
                if (f > 0) System.out.print(",");
                var rect = bounds(sprite, f, new AffineTransform(), 0);
                if (rect == null) rect = new Rectangle2D.Double();
                System.out.printf(Locale.US, "[%.3f,%.3f,%.3f,%.3f]", rect.getMinX()/20,
                    rect.getMinY()/20, rect.getMaxX()/20, rect.getMaxY()/20);
            }
            System.out.print("],\"labels\":{");
            boolean first = true;
            for (var frame : frames) for (var label : frame.labels) {
                if (!first) System.out.print(",");
                first = false;
                System.out.print("\"" + label + "\":" + frame.frame);
            }
            System.out.print("}}");
        }
        System.out.println("}}");
    }
}
