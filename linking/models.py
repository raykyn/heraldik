from django.db import models

class NormEntry(models.Model):
    """Database entry original name and corresponding normalized version."""
    entryNo = models.IntegerField(default=0)
    orig_name = models.CharField(max_length=200)
    norm_name = models.CharField(max_length=200)
    
    def __str__(self):
        return "({} - {})".format(self.orig_name, self.norm_name)
        
    def orig(self):
        return self.orig_name
        
    def norm(self):
        return self.norm_name


class MissingEntry(models.Model):
    """
    Database entry for missing persons/organizations/places in the database.
    """
    context = models.CharField(max_length=200)
    doc = models.CharField(max_length=200)
    ref = models.CharField(max_length=200)
    author = models.CharField(max_length=200)

    def __str__(self):
        return "\n".join([self.context, "Doc: "+self.doc, "Link: "+self.ref, "Submitted by "+self.author])
