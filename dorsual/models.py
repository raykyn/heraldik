from django.db import models


class dorsualEntry(models.Model):
    """Entry of a dorsual note and if it's correct or false."""
    collectionID = models.CharField(max_length=500)
    documentID = models.CharField(max_length=500)
    regionID = models.CharField(max_length=500)
    docAndRegion = models.CharField(max_length=1000, primary_key=True)

    documentTitle = models.CharField(max_length=200)
    dorsualType = models.CharField(max_length=200)

    imageSource = models.CharField(max_length=500)

    judgement = models.BooleanField()

    def __str__(self):
        return "{} - {} - {}".format(self.documentTitle, self.dorsualType, str(self.judgement))
